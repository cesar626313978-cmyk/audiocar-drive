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

  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private wakeLock: any = null;

  // Atomic request counter & AbortController to prevent track overlap on rapid skips
  private playRequestId: number = 0;
  private currentAbortController: AbortController | null = null;
  private activeTrack: Track | null = null;
  private currentBlobUrl: string | null = null;

  private onTimeUpdateCallback: ((time: number, duration: number) => void) | null = null;
  private onTrackEndCallback: (() => void) | null = null;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private onPrevTrackCallback: (() => void) | null = null;
  private onNextTrackCallback: (() => void) | null = null;
  private onPlayActionCallback: (() => void) | null = null;
  private onPauseActionCallback: (() => void) | null = null;
  private mediaSessionHandlersRegistered: boolean = false;

  private positionStateInterval: any = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.audio.dataset.engine = 'audiocar-drive-primary';
    this.setupListeners();
    this.registerExclusiveMediaSessionHandlers();
  }

  public getCurrentRequestId(): number {
    return this.playRequestId;
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

  public hasLoadedSourceFor(trackId: string): boolean {
    return Boolean(this.audio.src && this.activeTrack?.id === trackId && this.audio.readyState >= 1);
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

  private startAudioFocusKeepAlive() {
    if (!this.audioCtx || this.keepAliveOsc) return;
    try {
      this.keepAliveOsc = this.audioCtx.createOscillator();
      this.keepAliveGain = this.audioCtx.createGain();
      this.keepAliveOsc.type = 'sine';
      this.keepAliveOsc.frequency.value = 20;
      this.keepAliveGain.gain.value = 0.00001;
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

      this.compressor.connect(this.audioCtx.destination);
      this.compressor.connect(this.analyser);

      this.startAudioFocusKeepAlive();
    } catch (e) {
      console.warn('Web Audio API initialization deferred or failed:', e);
    }
  }

  private enforceTeslaExclusiveMediaSessionPlaying() {
    if (!('mediaSession' in navigator)) return;
    if (this.activeTrack) {
      this.updateMediaSessionMetadata(this.activeTrack);
    }
    this.registerExclusiveMediaSessionHandlers();
    try {
      navigator.mediaSession.playbackState = 'playing';
    } catch {
      // ignore
    }
  }

  private setupListeners() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('play', () => {
      this.enforceTeslaExclusiveMediaSessionPlaying();
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(true);
      }
    });

    this.audio.addEventListener('playing', () => {
      this.enforceTeslaExclusiveMediaSessionPlaying();
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(true);
      }
    });

    this.audio.addEventListener('pause', () => {
      if ('mediaSession' in navigator) {
        try {
          if (this.activeTrack && !navigator.mediaSession.metadata) {
            this.updateMediaSessionMetadata(this.activeTrack);
          }
          navigator.mediaSession.playbackState = 'paused';
        } catch {
          // ignore
        }
      }
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false);
      }
    });

    this.audio.addEventListener('ended', () => {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.playbackState = 'paused';
        } catch {
          // ignore
        }
      }
      if (this.onTrackEndCallback) {
        this.onTrackEndCallback();
      }
    });

    this.audio.addEventListener('stalled', () => {
      if (!this.audio.paused && this.audio.src) {
        this.audio.play().catch(() => {});
      }
    });
  }

  public setCallbacks(
    onTimeUpdate: (time: number, duration: number) => void,
    onTrackEnd: () => void,
    onStateChange: (isPlaying: boolean) => void,
    onPrevTrack?: () => void,
    onNextTrack?: () => void,
    onPlayAction?: () => void,
    onPauseAction?: () => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onTrackEndCallback = onTrackEnd;
    this.onStateChangeCallback = onStateChange;
    if (onPrevTrack) this.onPrevTrackCallback = onPrevTrack;
    if (onNextTrack) this.onNextTrackCallback = onNextTrack;
    if (onPlayAction) this.onPlayActionCallback = onPlayAction;
    if (onPauseAction) this.onPauseActionCallback = onPauseAction;
    this.registerExclusiveMediaSessionHandlers(true);
  }

  public registerExclusiveMediaSessionHandlers(force = false) {
    if (!('mediaSession' in navigator)) return;
    if (this.mediaSessionHandlersRegistered && !force) return;

    try {
      const handlePauseOrStop = () => {
        if (this.onPauseActionCallback) {
          this.onPauseActionCallback();
        } else {
          this.pausePlaybackPreservingSession();
        }
      };

      const handlePlay = () => {
        if ('mediaSession' in navigator) {
          try {
            if (this.activeTrack) {
              this.updateMediaSessionMetadata(this.activeTrack);
            }
            navigator.mediaSession.playbackState = 'playing';
          } catch {
            // ignore
          }
        }
        if (this.onPlayActionCallback) {
          this.onPlayActionCallback();
        } else {
          this.resumeOrReloadActiveTrack();
        }
      };

      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePauseOrStop);
      navigator.mediaSession.setActionHandler('stop', handlePauseOrStop);

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (this.onPrevTrackCallback) this.onPrevTrackCallback();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (this.onNextTrackCallback) this.onNextTrackCallback();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });

      this.mediaSessionHandlersRegistered = true;
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

  private async resolveTrackBlob(
    track: Track,
    token: string | null,
    signal?: AbortSignal,
    cacheOnly = false
  ): Promise<{ blobUrl: string; fromCache: boolean } | null> {
    let blob = await AudioCacheDB.getBlob(track.id);
    if (blob) {
      return { blobUrl: URL.createObjectURL(blob), fromCache: true };
    }
    if (cacheOnly || !token) {
      return null;
    }
    blob = await GoogleDriveService.fetchAudioBlobWithRetry(track, token, signal);
    if (signal?.aborted) {
      throw new DOMException('Track download aborted', 'AbortError');
    }
    await AudioCacheDB.saveBlob(track.id, blob);
    return { blobUrl: URL.createObjectURL(blob), fromCache: false };
  }

  /**
   * Anti-overlapping track playback with atomic requestId and AbortController.
   * Ensures only ONE track ever loads or plays, even if the user taps 10 tracks rapidly.
   */
  public async playTrack(
    track: Track,
    token: string | null,
    settings: AudioSettings,
    initialSeekTime = 0
  ): Promise<{ isOffline: boolean }> {
    const requestId = ++this.playRequestId;

    // 1. Abort any previous in-flight Drive download immediately
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    const abortController = new AbortController();
    this.currentAbortController = abortController;

    // 2. Immediately pause current audio and reset time to 0 so previous track never overlaps
    this.stopAllOtherAudioSources();
    this.audio.pause();
    this.audio.currentTime = 0;

    this.activeTrack = track;
    this.acquireWakeLock();

    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    this.startAudioFocusKeepAlive();

    // Update MediaSession metadata immediately for Tesla OS display
    this.updateMediaSessionMetadata(track);
    this.registerExclusiveMediaSessionHandlers();

    try {
      const resolved = await this.resolveTrackBlob(track, token, abortController.signal, false);

      // 3. Atomic guard: if another track was requested while this blob was loading, discard it
      if (requestId !== this.playRequestId || abortController.signal.aborted || !resolved) {
        if (resolved?.blobUrl) {
          URL.revokeObjectURL(resolved.blobUrl);
        }
        return { isOffline: false };
      }

      const previousBlobUrl = this.currentBlobUrl;
      this.currentBlobUrl = resolved.blobUrl;

      this.audio.src = resolved.blobUrl;
      if (initialSeekTime > 0) {
        this.audio.currentTime = initialSeekTime;
      } else {
        this.audio.currentTime = 0;
      }

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

      // Re-verify atomic request ID after async play() resolves
      if (requestId !== this.playRequestId) {
        this.audio.pause();
        return { isOffline: resolved.fromCache };
      }

      if (previousBlobUrl && previousBlobUrl !== resolved.blobUrl) {
        URL.revokeObjectURL(previousBlobUrl);
      }

      this.enforceTeslaExclusiveMediaSessionPlaying();
      this.startPositionStateTracker();
      return { isOffline: resolved.fromCache };
    } catch (err: any) {
      if (err?.name === 'AbortError' || requestId !== this.playRequestId) {
        return { isOffline: false };
      }
      console.error('Playback error:', err);
      throw err;
    }
  }

  /**
   * Restores a saved track session (from IndexedDB immediately or from network when token is ready)
   * at the exact saved second `seekTime`, and attempts automatic playback if `wasPlaying === true`.
   */
  public async restoreTrackFromSession(
    track: Track,
    seekTime: number,
    wasPlaying: boolean,
    token: string | null,
    settings: AudioSettings,
    cacheOnly = false
  ): Promise<{ restored: boolean; playing: boolean; autoplayBlocked: boolean; isOffline: boolean }> {
    const requestId = ++this.playRequestId;

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    const abortController = new AbortController();
    this.currentAbortController = abortController;

    this.stopAllOtherAudioSources();
    this.audio.pause();

    this.activeTrack = track;
    this.updateMediaSessionMetadata(track);
    this.registerExclusiveMediaSessionHandlers();

    try {
      const resolved = await this.resolveTrackBlob(track, token, abortController.signal, cacheOnly);
      if (!resolved) {
        return { restored: false, playing: false, autoplayBlocked: false, isOffline: false };
      }

      if (requestId !== this.playRequestId || abortController.signal.aborted) {
        URL.revokeObjectURL(resolved.blobUrl);
        return { restored: false, playing: false, autoplayBlocked: false, isOffline: resolved.fromCache };
      }

      const previousBlobUrl = this.currentBlobUrl;
      this.currentBlobUrl = resolved.blobUrl;
      this.audio.src = resolved.blobUrl;

      // Apply exact saved second as soon as metadata loads or immediately
      const applySavedTime = () => {
        if (seekTime > 0 && (!this.audio.duration || seekTime < this.audio.duration)) {
          try {
            this.audio.currentTime = seekTime;
          } catch {
            // ignore
          }
        }
      };

      if (this.audio.readyState >= 1) {
        applySavedTime();
      } else {
        this.audio.addEventListener('loadedmetadata', applySavedTime, { once: true });
      }

      if (previousBlobUrl && previousBlobUrl !== resolved.blobUrl) {
        URL.revokeObjectURL(previousBlobUrl);
      }

      if (!wasPlaying) {
        return { restored: true, playing: false, autoplayBlocked: false, isOffline: resolved.fromCache };
      }

      // Attempt automatic playback
      try {
        this.initWebAudio();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume().catch(() => {});
        }
        applySavedTime();
        await this.audio.play();

        if (requestId !== this.playRequestId) {
          this.audio.pause();
          return { restored: true, playing: false, autoplayBlocked: false, isOffline: resolved.fromCache };
        }

        if (this.gainNode) {
          this.gainNode.gain.value = 1;
        }
        this.startAudioFocusKeepAlive();
        this.enforceTeslaExclusiveMediaSessionPlaying();
        this.startPositionStateTracker();
        return { restored: true, playing: true, autoplayBlocked: false, isOffline: resolved.fromCache };
      } catch (playErr: any) {
        // Chromium blocked autoplay without user interaction (NotAllowedError)
        console.warn('Autoplay blocked by browser policy, awaiting user gesture:', playErr?.name);
        return { restored: true, playing: false, autoplayBlocked: true, isOffline: resolved.fromCache };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { restored: false, playing: false, autoplayBlocked: false, isOffline: false };
      }
      console.warn('Session track restore deferred:', err);
      return { restored: false, playing: false, autoplayBlocked: false, isOffline: false };
    }
  }

  /**
   * Resumes a pre-loaded session track immediately upon the user's first touch/click.
   */
  public async resumeRestoredSession(
    track: Track,
    seekTime: number,
    token: string | null,
    settings: AudioSettings
  ): Promise<boolean> {
    this.stopAllOtherAudioSources();
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume().catch(() => {});
    }
    this.startAudioFocusKeepAlive();

    if (this.audio.src && this.activeTrack?.id === track.id) {
      try {
        if (seekTime > 0 && Math.abs(this.audio.currentTime - seekTime) > 2) {
          this.audio.currentTime = seekTime;
        }
        await this.audio.play();
        this.enforceTeslaExclusiveMediaSessionPlaying();
        this.startPositionStateTracker();
        return true;
      } catch {
        // Fall through to full playTrack
      }
    }

    await this.playTrack(track, token, settings, seekTime);
    return true;
  }

  public pausePlaybackPreservingSession() {
    this.audio.pause();
    if ('mediaSession' in navigator) {
      try {
        if (this.activeTrack && !navigator.mediaSession.metadata) {
          this.updateMediaSessionMetadata(this.activeTrack);
        }
        navigator.mediaSession.playbackState = 'paused';
      } catch {
        // ignore
      }
    }
  }

  public resumeOrReloadActiveTrack(): boolean {
    this.stopAllOtherAudioSources();
    this.initWebAudio();
    this.startAudioFocusKeepAlive();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    this.enforceTeslaExclusiveMediaSessionPlaying();

    if (this.audio.src) {
      this.audio
        .play()
        .then(() => {
          this.enforceTeslaExclusiveMediaSessionPlaying();
        })
        .catch(() => {
          if (this.onPlayActionCallback) {
            this.onPlayActionCallback();
          }
        });
      return true;
    } else if (this.onPlayActionCallback) {
      this.onPlayActionCallback();
      return true;
    }
    return false;
  }

  public togglePlayPause(): boolean {
    this.stopAllOtherAudioSources();
    if (this.audio.paused) {
      return this.resumeOrReloadActiveTrack();
    } else {
      this.pausePlaybackPreservingSession();
      return false;
    }
  }

  public stopAndCleanup() {
    this.playRequestId++;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.stopAudioFocusKeepAlive();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {
        // ignore
      }
    }
  }

  public seek(time: number) {
    if (!isNaN(time) && isFinite(time)) {
      this.audio.currentTime = time;
    }
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  public setVolume(vol: number) {
    this.audio.volume = vol;
  }

  public async prewarmNextTracks(tracks: Track[], currentIndex: number, token: string | null, count = 2) {
    if (!token || tracks.length === 0) return;
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
      try {
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
      } catch {
        // ignore
      }
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
