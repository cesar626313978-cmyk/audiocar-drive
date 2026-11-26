import { Track, AudioSettings } from '../types/audio';
import { AudioCacheDB } from './db';
import { GoogleDriveService } from './drive';

export class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;

  // Sub-audible keep-alive nodes to prevent Tesla OS / Automotive CarAudioService
  // from detecting an idle hardware sink during track transitions and jumping to FM Radio
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private wakeLock: any = null;
  private isTransitioningTrack: boolean = false;

  private currentBlobUrl: string | null = null;

  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onTrackEndCallback: (() => void) | null = null;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private onPrevTrackCallback: (() => void) | null = null;
  private onNextTrackCallback: (() => void) | null = null;

  private positionStateInterval: any = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.audio.dataset.engine = 'audiocar-drive-primary';
    this.setupListeners();
  }

  /**
   * Safely retrieves real-time frequency data from the Web Audio AnalyserNode.
   * Returns true if real non-zero frequency energy is present, or false if unavailable/silent/CORS-restricted.
   */
  public getFrequencyData(targetBuffer: Uint8Array): boolean {
    if (!this.analyser || !this.audioCtx || this.audioCtx.state !== 'running' || this.audio.paused) {
      return false;
    }
    try {
      this.analyser.getByteFrequencyData(targetBuffer as Uint8Array<ArrayBuffer>);
      let energySum = 0;
      for (let i = 0; i < targetBuffer.length; i++) {
        energySum += targetBuffer[i];
        if (energySum > 15) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public isAudioPlaying(): boolean {
    return !this.audio.paused && this.audio.readyState >= 2;
  }

  /**
   * Stops and cleans up any stray <audio> elements or previous radio streams in the DOM/window
   * so that only our single AudioEngine instance ever plays.
   */
  public stopAllOtherAudioSources() {
    try {
      const allAudios = document.querySelectorAll('audio');
      allAudios.forEach((el) => {
        if (el !== this.audio && el.dataset.engine !== 'audiocar-drive-primary') {
          el.pause();
          el.removeAttribute('src');
          el.load();
        }
      });

      const win = window as any;
      if (win.__audiocarRadioAudio && win.__audiocarRadioAudio !== this.audio) {
        try {
          win.__audiocarRadioAudio.pause();
          win.__audiocarRadioAudio.removeAttribute('src');
          win.__audiocarRadioAudio.load();
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn('Error cleaning external audio elements:', e);
    }
  }

  /**
   * Acquires Screen/System WakeLock so the automotive browser never throttles background timers or audio buffers
   */
  private async acquireWakeLock() {
    if ('wakeLock' in navigator && !this.wakeLock) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      } catch {
        // WakeLock not permitted or unsupported
      }
    }
  }

  /**
   * Starts a continuous sub-audible carrier (-90dB) on the WebAudio hardware sink
   * so Tesla OS / Automotive Audio Focus never drops to 'none' between tracks.
   */
  private startAudioFocusKeepAlive() {
    if (!this.audioCtx || this.keepAliveOsc) return;
    try {
      this.keepAliveOsc = this.audioCtx.createOscillator();
      this.keepAliveGain = this.audioCtx.createGain();
      this.keepAliveOsc.type = 'sine';
      this.keepAliveOsc.frequency.value = 20; // 20Hz sub-audible
      this.keepAliveGain.gain.value = 0.00001; // -100dB imperceptible keep-alive
      this.keepAliveOsc.connect(this.keepAliveGain);
      this.keepAliveGain.connect(this.audioCtx.destination);
      this.keepAliveOsc.start();
    } catch (e) {
      console.warn('Keep-alive oscillator failed:', e);
    }
  }

  private stopAudioFocusKeepAlive() {
    if (this.keepAliveOsc) {
      try {
        this.keepAliveOsc.stop();
        this.keepAliveOsc.disconnect();
      } catch {
        // ignore
      }
      this.keepAliveOsc = null;
    }
    if (this.keepAliveGain) {
      try {
        this.keepAliveGain.disconnect();
      } catch {
        // ignore
      }
      this.keepAliveGain = null;
    }
  }

  private initWebAudio() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      const source = this.audioCtx.createMediaElementSource(this.audio);
      this.gainNode = this.audioCtx.createGain();
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

      // Non-intrusive AnalyserNode branch for real-time 56-bar spectrum visualization
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      source
        .connect(this.gainNode)
        .connect(this.bassFilter)
        .connect(this.midFilter)
        .connect(this.trebleFilter)
        .connect(this.compressor);

      // Connect main output directly to destination AND tap into analyser in parallel
      this.compressor.connect(this.audioCtx.destination);
      this.compressor.connect(this.analyser);

      this.startAudioFocusKeepAlive();
    } catch (e) {
      console.warn('Web Audio API initialization deferred or failed:', e);
    }
  }

  private setupListeners() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('ended', () => {
      // Immediately keep MediaSession marked as 'playing' during track transition
      // so the vehicle OS does not reclaim audio focus for FM/AM radio
      this.isTransitioningTrack = true;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      if (this.onTrackEndCallback) {
        this.onTrackEndCallback();
      }
    });

    this.audio.addEventListener('play', () => {
      this.isTransitioningTrack = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(true);
      }
    });

    this.audio.addEventListener('pause', () => {
      // Do not broadcast 'paused' to OS if we are simply swapping the blob URL for the next track
      if (this.isTransitioningTrack) return;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false);
      }
    });

    this.audio.addEventListener('stalled', () => {
      // Attempt automatic recovery if audio buffer stalls mid-track
      if (!this.audio.paused && this.audio.src) {
        this.audio.play().catch(() => {});
      }
    });

    // Global postMessage listener for parent Launcher volume commands ({ type: 'AUDIOCAR_SET_VOLUME', level })
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        if (event.data && event.data.type === 'AUDIOCAR_SET_VOLUME') {
          const rawLevel = Number(event.data.level);
          if (!isNaN(rawLevel)) {
            this.setVolume(rawLevel);
          }
        }
      });
    }
  }

  public setCallbacks(
    onTimeUpdate: (time: number, duration: number) => void,
    onTrackEnd: () => void,
    onStateChange: (isPlaying: boolean) => void,
    onPrevTrack?: () => void,
    onNextTrack?: () => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onTrackEndCallback = onTrackEnd;
    this.onStateChangeCallback = onStateChange;
    if (onPrevTrack) this.onPrevTrackCallback = onPrevTrack;
    if (onNextTrack) this.onNextTrackCallback = onNextTrack;
    this.registerExclusiveMediaSessionHandlers();
  }

  public registerExclusiveMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    try {
      const actions: MediaSessionAction[] = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'stop'];
      actions.forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore unsupported action
        }
      });

      navigator.mediaSession.setActionHandler('play', () => {
        this.stopAllOtherAudioSources();
        this.startAudioFocusKeepAlive();
        this.audio.play().catch(() => {});
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.isTransitioningTrack = false;
        this.audio.pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.isTransitioningTrack = true;
        if (this.onPrevTrackCallback) this.onPrevTrackCallback();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.isTransitioningTrack = true;
        if (this.onNextTrackCallback) this.onNextTrackCallback();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    } catch (e) {
      console.warn('MediaSession handler registration error:', e);
    }
  }

  public updateSettings(settings: AudioSettings) {
    if (!this.audioCtx) return;

    if (this.compressor) {
      if (settings.agcEnabled) {
        this.compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
      } else {
        this.compressor.threshold.setValueAtTime(0, this.audioCtx.currentTime);
        this.compressor.ratio.setValueAtTime(1, this.audioCtx.currentTime);
      }
    }

    if (this.bassFilter) this.bassFilter.gain.value = settings.eqBands.bass;
    if (this.midFilter) this.midFilter.gain.value = settings.eqBands.mid;
    if (this.trebleFilter) this.trebleFilter.gain.value = settings.eqBands.treble;
  }

  private async getTrackBlobUrl(track: Track, token: string | null): Promise<string> {
    let blob = await AudioCacheDB.getBlob(track.id);
    if (!blob) {
      blob = await GoogleDriveService.fetchAudioBlobWithRetry(track, token);
      await AudioCacheDB.saveBlob(track.id, blob);
    }
    return URL.createObjectURL(blob);
  }

  public async playTrack(track: Track, token: string | null, settings: AudioSettings): Promise<void> {
    this.isTransitioningTrack = true;
    this.stopAllOtherAudioSources();
    this.acquireWakeLock();

    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    this.startAudioFocusKeepAlive();

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    this.updateMediaSessionMetadata(track);

    try {
      // Fetch/resolve the next track's Blob URL BEFORE pausing or swapping src
      // so there is zero dead air gap that could trigger vehicle FM radio fallback
      const blobUrl = await this.getTrackBlobUrl(track, token);

      const previousBlobUrl = this.currentBlobUrl;
      this.currentBlobUrl = blobUrl;

      this.audio.src = blobUrl;
      this.audio.currentTime = 0;

      if (this.gainNode && this.audioCtx) {
        if (settings.crossfadeSeconds > 0) {
          const now = this.audioCtx.currentTime;
          this.gainNode.gain.setValueAtTime(0.15, now);
          this.gainNode.gain.linearRampToValueAtTime(1, now + Math.min(settings.crossfadeSeconds, 3));
        } else {
          this.gainNode.gain.value = 1;
        }
      }

      await this.audio.play();
      this.isTransitioningTrack = false;

      if (previousBlobUrl) {
        URL.revokeObjectURL(previousBlobUrl);
      }

      this.registerExclusiveMediaSessionHandlers();
      this.startPositionStateTracker();
    } catch (err) {
      this.isTransitioningTrack = false;
      console.error('Playback error:', err);
      throw err;
    }
  }

  public togglePlayPause(): boolean {
    this.stopAllOtherAudioSources();
    if (this.audio.paused) {
      this.startAudioFocusKeepAlive();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.audio.play().catch(() => {});
      return true;
    } else {
      this.isTransitioningTrack = false;
      this.audio.pause();
      this.stopAudioFocusKeepAlive();
      return false;
    }
  }

  public stopAndCleanup() {
    this.isTransitioningTrack = false;
    this.stopAudioFocusKeepAlive();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  public seek(time: number) {
    if (!isNaN(time) && isFinite(time)) {
      this.audio.currentTime = time;
    }
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, Number(vol)));
    if (!isNaN(clamped)) {
      this.audio.volume = clamped;
      document.querySelectorAll('audio').forEach((el) => {
        el.volume = clamped;
      });
    }
  }

  public async prewarmNextTracks(tracks: Track[], currentIndex: number, token: string | null, count = 2) {
    const limit = Math.max(1, Math.min(count, 3));
    for (let i = 1; i <= limit; i++) {
      const nextTrack = tracks[(currentIndex + i) % tracks.length];
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
          {
            src: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&h=512&fit=crop',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      });
    }
  }

  private startPositionStateTracker() {
    if (this.positionStateInterval) clearInterval(this.positionStateInterval);
    this.positionStateInterval = setInterval(() => {
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        if (!this.audio.paused && !isNaN(this.audio.duration) && this.audio.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: this.audio.duration,
              playbackRate: this.audio.playbackRate,
              position: Math.min(this.audio.currentTime, this.audio.duration)
            });
          } catch {
            // ignore
          }
        }
      }
    }, 300);
  }
}

export const audioEngine = new AudioEngine();
