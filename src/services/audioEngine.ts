import { Track, AudioSettings } from '../types/audio';
import { AudioCacheDB } from './db';
import { GoogleDriveService } from './drive';

export class AudioEngine {
  private audioA: HTMLAudioElement;
  private audioB: HTMLAudioElement;
  private activePlayer: 'A' | 'B' = 'A';
  
  private audioCtx: AudioContext | null = null;
  private gainA: GainNode | null = null;
  private gainB: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;

  private currentBlobUrlA: string | null = null;
  private currentBlobUrlB: string | null = null;

  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onTrackEndCallback: (() => void) | null = null;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;

  private isCrossfading = false;
  private positionStateInterval: any = null;

  constructor() {
    this.audioA = new Audio();
    this.audioB = new Audio();
    this.audioA.crossOrigin = 'anonymous';
    this.audioB.crossOrigin = 'anonymous';

    this.setupListeners(this.audioA, 'A');
    this.setupListeners(this.audioB, 'B');
  }

  private initWebAudio() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      const sourceA = this.audioCtx.createMediaElementSource(this.audioA);
      const sourceB = this.audioCtx.createMediaElementSource(this.audioB);

      this.gainA = this.audioCtx.createGain();
      this.gainB = this.audioCtx.createGain();
      this.compressor = this.audioCtx.createDynamicsCompressor();

      // Equalizer filters
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 250;

      this.midFilter = this.audioCtx.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 1500;
      this.midFilter.Q.value = 1;

      this.trebleFilter = this.audioCtx.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 4000;

      // Routing: sourceA/B -> gainA/B -> bass -> mid -> treble -> compressor -> destination
      sourceA.connect(this.gainA);
      sourceB.connect(this.gainB);

      // Merge gain outputs to filter chain
      const merger = this.audioCtx.createGain();
      this.gainA.connect(merger);
      this.gainB.connect(merger);

      merger
        .connect(this.bassFilter)
        .connect(this.midFilter)
        .connect(this.trebleFilter)
        .connect(this.compressor)
        .connect(this.audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio API initialization deferred or failed:', e);
    }
  }

  private setupListeners(audio: HTMLAudioElement, playerKey: 'A' | 'B') {
    audio.addEventListener('timeupdate', () => {
      if (this.activePlayer === playerKey) {
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(audio.currentTime, audio.duration || 0);
        }
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activePlayer === playerKey && !this.isCrossfading) {
        if (this.onTrackEndCallback) {
          this.onTrackEndCallback();
        }
      }
    });

    audio.addEventListener('play', () => {
      if (this.activePlayer === playerKey && this.onStateChangeCallback) {
        this.onStateChangeCallback(true);
      }
    });

    audio.addEventListener('pause', () => {
      if (this.activePlayer === playerKey && this.onStateChangeCallback) {
        this.onStateChangeCallback(false);
      }
    });
  }

  public setCallbacks(
    onTimeUpdate: (time: number, duration: number) => void,
    onTrackEnd: () => void,
    onStateChange: (isPlaying: boolean) => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onTrackEndCallback = onTrackEnd;
    this.onStateChangeCallback = onStateChange;
  }

  public updateSettings(settings: AudioSettings) {
    if (!this.audioCtx) return;

    // AGC compressor threshold & ratio
    if (this.compressor) {
      if (settings.agcEnabled) {
        this.compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
      } else {
        this.compressor.threshold.setValueAtTime(0, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(1, this.audioCtx.currentTime);
      }
    }

    // EQ bands
    if (this.bassFilter) this.bassFilter.gain.value = settings.eqBands.bass;
    if (this.midFilter) this.midFilter.gain.value = settings.eqBands.mid;
    if (this.trebleFilter) this.trebleFilter.gain.value = settings.eqBands.treble;
  }

  private async getTrackBlobUrl(track: Track, token: string | null): Promise<string> {
    // 1. Check IndexedDB cache
    let blob = await AudioCacheDB.getBlob(track.id);
    if (!blob) {
      // 2. Fetch from Drive / CDN with retry
      try {
        blob = await GoogleDriveService.fetchAudioBlobWithRetry(track, token);
        await AudioCacheDB.saveBlob(track.id, blob);
      } catch (err) {
        console.warn('Failed to fetch blob for track:', track.name, err);
        throw err;
      }
    }
    const url = URL.createObjectURL(blob);
    return url;
  }

  public async playTrack(track: Track, token: string | null, settings: AudioSettings): Promise<void> {
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const nextPlayer: 'A' | 'B' = this.activePlayer === 'A' ? 'B' : 'A';
    const targetAudio = nextPlayer === 'A' ? this.audioA : this.audioB;
    const currentAudio = this.activePlayer === 'A' ? this.audioA : this.audioB;

    try {
      const blobUrl = await this.getTrackBlobUrl(track, token);

      if (nextPlayer === 'A') {
        if (this.currentBlobUrlA) URL.revokeObjectURL(this.currentBlobUrlA);
        this.currentBlobUrlA = blobUrl;
      } else {
        if (this.currentBlobUrlB) URL.revokeObjectURL(this.currentBlobUrlB);
        this.currentBlobUrlB = blobUrl;
      }

      targetAudio.src = blobUrl;
      targetAudio.currentTime = 0;
      await targetAudio.load();

      // Crossfade logic
      const crossfadeMs = settings.crossfadeSeconds * 1000;
      if (crossfadeMs > 0 && !currentAudio.paused && currentAudio.currentTime > 0) {
        this.isCrossfading = true;
        const targetGain = nextPlayer === 'A' ? this.gainA : this.gainB;
        const currentGain = this.activePlayer === 'A' ? this.gainA : this.gainB;

        if (targetGain && currentGain && this.audioCtx) {
          const now = this.audioCtx.currentTime;
          targetGain.gain.setValueAtTime(0, now);
          targetGain.gain.linearRampToValueAtTime(1, now + settings.crossfadeSeconds);

          currentGain.gain.setValueAtTime(1, now);
          currentGain.gain.linearRampToValueAtTime(0, now + settings.crossfadeSeconds);
        }

        await targetAudio.play();

        setTimeout(() => {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          this.activePlayer = nextPlayer;
          this.isCrossfading = false;
        }, crossfadeMs);
      } else {
        // Instant switch
        currentAudio.pause();
        currentAudio.currentTime = 0;
        
        if (this.gainA && this.gainB && this.audioCtx) {
          this.gainA.gain.value = nextPlayer === 'A' ? 1 : 0;
          this.gainB.gain.value = nextPlayer === 'B' ? 1 : 0;
        }

        await targetAudio.play();
        this.activePlayer = nextPlayer;
      }

      this.updateMediaSessionMetadata(track);
      this.startPositionStateTracker();
    } catch (err) {
      console.error('Playback error:', err);
      throw err;
    }
  }

  public togglePlayPause(): boolean {
    const audio = this.activePlayer === 'A' ? this.audioA : this.audioB;
    if (audio.paused) {
      audio.play();
      return true;
    } else {
      audio.pause();
      return false;
    }
  }

  public seek(time: number) {
    const audio = this.activePlayer === 'A' ? this.audioA : this.audioB;
    audio.currentTime = time;
  }

  public setVolume(vol: number) {
    this.audioA.volume = vol;
    this.audioB.volume = vol;
  }

  public async prewarmNextTracks(tracks: Track[], currentIndex: number, token: string | null, count: number) {
    for (let i = 1; i <= count; i++) {
      const nextTrack = tracks[currentIndex + i];
      if (nextTrack) {
        try {
          const cached = await AudioCacheDB.getBlob(nextTrack.id);
          if (!cached) {
            const blob = await GoogleDriveService.fetchAudioBlobWithRetry(nextTrack, token);
            await AudioCacheDB.saveBlob(nextTrack.id, blob);
          }
        } catch (e) {
          console.warn('Prewarm failed for track:', nextTrack.name);
        }
      }
    }
  }

  private updateMediaSessionMetadata(track: Track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: track.artist || 'Google Drive Music',
        album: track.album || 'AudioCar Drive',
        artwork: [
          { src: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&h=512&fit=crop', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        const audio = this.activePlayer === 'A' ? this.audioA : this.audioB;
        audio.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        const audio = this.activePlayer === 'A' ? this.audioA : this.audioB;
        audio.pause();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    }
  }

  private startPositionStateTracker() {
    if (this.positionStateInterval) clearInterval(this.positionStateInterval);
    this.positionStateInterval = setInterval(() => {
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        const audio = this.activePlayer === 'A' ? this.audioA : this.audioB;
        if (!audio.paused && !isNaN(audio.duration)) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate,
              position: audio.currentTime
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }, 300);
  }
}

export const audioEngine = new AudioEngine();
