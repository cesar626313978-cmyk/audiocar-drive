import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track, PlaylistFolder, AudioSettings, PlaybackState } from './types/audio';
import { GoogleDriveAuth, GoogleDriveService } from './services/drive';
import { TeslaFleetService } from './services/tesla';
import { audioEngine } from './services/audioEngine';
import { AudioCacheDB } from './services/db';
import { Navbar } from './components/Navbar';
import { FolderExplorer } from './components/FolderExplorer';
import { PlayerPanel } from './components/PlayerPanel';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { LoginModal } from './components/LoginModal';
import { AlertCircle, Loader2 } from 'lucide-react';

const DRIVE_SESSION_KEY = 'audiocar_drive_session_v1';
const THEME_STORAGE_KEY = 'audiocar_theme';

interface PersistedDriveSession {
  folderId: string;
  folderName: string;
  playlist: Array<{
    id: string;
    name: string;
    artist?: string;
    album?: string;
    duration?: number;
    mimeType?: string;
    downloadUrl?: string;
    parentId?: string;
  }>;
  currentTrackId: string | null;
  currentTime: number;
  wasPlaying: boolean;
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPicture, setUserPicture] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string>('root-empty');
  const [folderName, setFolderName] = useState<string>('mimusica (Drive)');
  const [library, setLibrary] = useState<PlaylistFolder>({
    id: 'root-empty',
    name: 'mimusica',
    tracks: []
  });
  const [folderNotFound, setFolderNotFound] = useState<boolean>(false);
  const [folderErrorMsg, setFolderErrorMsg] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [cacheSize, setCacheSize] = useState<string>('0.0');

  const [settings, setSettings] = useState<AudioSettings>({
    crossfadeSeconds: 4,
    agcEnabled: true,
    eqBands: { bass: 2, mid: 0, treble: 1 },
    bufferAheadCount: 3,
    theme: 'dark',
    autoDimOnReverse: true
  });

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
    queue: [],
    queueIndex: 0,
    repeatMode: 'off',
    shuffle: false,
    isOffline: false,
    activePlayer: 'A',
    volume: 0.8
  });

  const [downloadedTrackIds, setDownloadedTrackIds] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

  // Resume session state when Chromium blocks autoplay on startup
  const [showResumeOverlay, setShowResumeOverlay] = useState<boolean>(false);
  const [savedResumeTime, setSavedResumeTime] = useState<number>(0);
  const pendingNetworkSessionRef = useRef<PersistedDriveSession | null>(null);

  // Dual view switcher for screens < 1100px (Tesla Drive Split-Screen)
  const [mobileView, setMobileView] = useState<'player' | 'library'>('library');

  // Tesla Fleet API Session & Shift State
  const [hasTeslaSession, setHasTeslaSession] = useState<boolean>(false);
  const [teslaShiftState, setTeslaShiftState] = useState<string | null>(null);
  const isReverseDimmedRef = useRef<boolean>(false);

  // Atomic playRequestIdRef to prevent UI/Audio desynchronization on rapid skips
  const playRequestIdRef = useRef<number>(0);
  const nextTrackRef = useRef<() => void>(() => {});
  const prevTrackRef = useRef<() => void>(() => {});
  const playbackStateRef = useRef<PlaybackState>(playbackState);
  const activeFolderRef = useRef<{ id: string; name: string }>({ id: activeFolderId, name: folderName });

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    activeFolderRef.current = { id: activeFolderId, name: folderName };
  }, [activeFolderId, folderName]);

  // Save session snapshot to localStorage ('audiocar_drive_session_v1')
  const persistDriveSession = useCallback(
    (override?: Partial<{ wasPlaying: boolean; currentTime: number; track: Track | null; queue: Track[] }>) => {
      const state = playbackStateRef.current;
      const track = override?.track !== undefined ? override.track : state.currentTrack;
      const queue = override?.queue !== undefined ? override.queue : state.queue;
      if (!track && queue.length === 0) return;

      const currentTime =
        override?.currentTime !== undefined
          ? override.currentTime
          : audioEngine.getCurrentTime() || state.currentTime || 0;
      const wasPlaying =
        override?.wasPlaying !== undefined ? override.wasPlaying : state.isPlaying;

      const lightPlaylist = queue.slice(0, 300).map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        mimeType: t.mimeType || 'audio/mpeg',
        downloadUrl: t.downloadUrl || `https://www.googleapis.com/drive/v3/files/${t.id}?alt=media`,
        parentId: t.parentId
      }));

      const payload: PersistedDriveSession = {
        folderId: activeFolderRef.current.id,
        folderName: activeFolderRef.current.name,
        playlist: lightPlaylist,
        currentTrackId: track?.id || null,
        currentTime: Math.floor(currentTime),
        wasPlaying
      };

      try {
        localStorage.setItem(DRIVE_SESSION_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('Could not persist session to localStorage:', e);
      }
    },
    []
  );

  // Save session every 5 seconds while playing
  useEffect(() => {
    if (!playbackState.isPlaying || !playbackState.currentTrack) return;
    const interval = setInterval(() => {
      persistDriveSession({ wasPlaying: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [playbackState.isPlaying, playbackState.currentTrack, persistDriveSession]);

  // Initialize single exclusive audio engine, MediaSession, and instant IndexedDB session restore on mount
  useEffect(() => {
    audioEngine.stopAllOtherAudioSources();

    try {
      const externalPlayers = document.querySelectorAll(
        '#hub-mini-player, .hub-mini-player, [data-hub-player], footer:not([data-player="audiocar-drive-single-footer"])'
      );
      externalPlayers.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
    } catch {
      // ignore
    }

    audioEngine.setCallbacks(
      (time, duration) => {
        setPlaybackState((prev) => ({
          ...prev,
          currentTime: time,
          duration: duration || prev.duration
        }));
      },
      () => {
        nextTrackRef.current();
      },
      (isPlaying) => {
        setPlaybackState((prev) => ({ ...prev, isPlaying }));
        if (isPlaying) {
          setShowResumeOverlay(false);
        }
      },
      () => {
        prevTrackRef.current();
      },
      () => {
        nextTrackRef.current();
      }
    );

    audioEngine.updateSettings(settings);
    AudioCacheDB.getCacheSizeMB().then(setCacheSize);

    // 1. Instant local session & IndexedDB restoration (zero network wait)
    restorePersistedSessionImmediately();

    // 2. Autoconnect / silent renewal via audiocar_user_hint
    checkAndRestoreSession();

    // 3. Check shared Tesla Fleet API session in localStorage ('audiocar_tesla_session')
    const checkTeslaSession = () => {
      const session = TeslaFleetService.getSession();
      setHasTeslaSession(Boolean(session && session.access_token));
    };
    checkTeslaSession();
    window.addEventListener('storage', checkTeslaSession);
    return () => window.removeEventListener('storage', checkTeslaSession);
  }, []);

  const restorePersistedSessionImmediately = async () => {
    try {
      const raw = localStorage.getItem(DRIVE_SESSION_KEY);
      if (!raw) return;
      const saved: PersistedDriveSession = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.playlist) || saved.playlist.length === 0) return;

      const restoredQueue: Track[] = saved.playlist.map((item) => ({
        id: item.id,
        name: item.name,
        artist: item.artist || saved.folderName || 'Google Drive',
        album: item.album || saved.folderName || 'mimusica',
        duration: item.duration,
        mimeType: item.mimeType || 'audio/mpeg',
        downloadUrl: item.downloadUrl || `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`,
        parentId: item.parentId || saved.folderId
      }));

      const targetIndex = saved.currentTrackId
        ? Math.max(0, restoredQueue.findIndex((t) => t.id === saved.currentTrackId))
        : 0;
      const targetTrack = restoredQueue[targetIndex] || restoredQueue[0];

      if (saved.folderId) setActiveFolderId(saved.folderId);
      if (saved.folderName) setFolderName(saved.folderName);

      // Populate temporary library view from saved playlist immediately so user sees tracks right away
      setLibrary((prev) =>
        prev.tracks.length === 0 && (!prev.subfolders || prev.subfolders.length === 0)
          ? {
              id: saved.folderId || 'restored-folder',
              name: saved.folderName || 'mimusica',
              tracks: restoredQueue
            }
          : prev
      );

      setPlaybackState((prev) => ({
        ...prev,
        currentTrack: targetTrack,
        queue: restoredQueue,
        queueIndex: targetIndex,
        currentTime: saved.currentTime || 0
      }));
      setSavedResumeTime(saved.currentTime || 0);

      if (saved.wasPlaying) {
        setMobileView('player');
      }

      // Attempt immediate playback from IndexedDB (even before network token arrives)
      const storedToken = GoogleDriveAuth.getStoredToken();
      const result = await audioEngine.restoreTrackFromSession(
        targetTrack,
        saved.currentTime || 0,
        saved.wasPlaying,
        storedToken,
        settings,
        !storedToken
      );

      if (result.restored) {
        setPlaybackState((prev) => ({
          ...prev,
          isPlaying: result.playing,
          isOffline: result.isOffline,
          currentTime: saved.currentTime || 0
        }));
        if (saved.wasPlaying && (result.autoplayBlocked || !result.playing)) {
          setShowResumeOverlay(true);
        }
      } else {
        // Track was not in IndexedDB and token wasn't ready yet; defer until silentRefresh completes
        pendingNetworkSessionRef.current = saved;
        if (saved.wasPlaying) {
          setShowResumeOverlay(true);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved drive session:', e);
    }
  };

  // Global first-touch listener to resume playback when showResumeOverlay is active
  const handleResumeNow = useCallback(async () => {
    const state = playbackStateRef.current;
    if (!state.currentTrack) return;

    setShowResumeOverlay(false);
    const activeTok = token || GoogleDriveAuth.getStoredToken();
    const resumeSec = savedResumeTime || state.currentTime || 0;

    try {
      await audioEngine.resumeRestoredSession(state.currentTrack, resumeSec, activeTok, settings);
      setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
    } catch (e) {
      console.warn('Resume session error:', e);
    }
  }, [token, savedResumeTime, settings]);

  useEffect(() => {
    if (!showResumeOverlay || !playbackState.currentTrack) return;

    const handleFirstScreenTouch = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      // Do not intercept if the user tapped a specific interactive button/input (like Folder list or Settings)
      if (target && target.closest('button, input, a, [data-no-autostart]')) {
        return;
      }
      handleResumeNow();
    };

    window.addEventListener('pointerdown', handleFirstScreenTouch, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstScreenTouch);
    };
  }, [showResumeOverlay, playbackState.currentTrack, handleResumeNow]);

  // Poll Tesla drive_state every 4 seconds when autoDimOnReverse is enabled and Tesla session exists
  useEffect(() => {
    if (!hasTeslaSession || !settings.autoDimOnReverse) return;

    const pollDriveState = async () => {
      const { shift_state } = await TeslaFleetService.getShiftState();
      if (shift_state) {
        setTeslaShiftState(shift_state);

        if (shift_state === 'R' && !isReverseDimmedRef.current) {
          isReverseDimmedRef.current = true;
          await TeslaFleetService.sendCommand('media_volume_down', 3);
        } else if ((shift_state === 'D' || shift_state === 'P') && isReverseDimmedRef.current) {
          isReverseDimmedRef.current = false;
          await TeslaFleetService.sendCommand('media_volume_up', 3);
        }
      }
    };

    pollDriveState();
    const interval = setInterval(pollDriveState, 4000);
    return () => clearInterval(interval);
  }, [hasTeslaSession, settings.autoDimOnReverse]);

  const checkAndRestoreSession = async () => {
    let activeToken = GoogleDriveAuth.getStoredToken();
    const userHint = GoogleDriveAuth.getUserHint();

    // If token is missing/expired but audiocar_user_hint or clientId exists, trigger silent refresh in background
    if (!activeToken && (userHint || GoogleDriveAuth.getStoredClientId())) {
      activeToken = await GoogleDriveAuth.silentRefresh();
    }

    if (activeToken) {
      setToken(activeToken);
      setIsAuthenticated(true);
      setUserEmail(GoogleDriveAuth.getStoredEmail());
      setUserPicture(GoogleDriveAuth.getStoredPicture());

      // If we had a pending session track that wasn't cached in IndexedDB, restore it now from network
      if (pendingNetworkSessionRef.current && playbackStateRef.current.currentTrack) {
        const pending = pendingNetworkSessionRef.current;
        pendingNetworkSessionRef.current = null;
        const res = await audioEngine.restoreTrackFromSession(
          playbackStateRef.current.currentTrack,
          pending.currentTime || 0,
          pending.wasPlaying,
          activeToken,
          settings,
          false
        );
        if (res.playing) {
          setPlaybackState((prev) => ({ ...prev, isPlaying: true, isOffline: res.isOffline }));
          setShowResumeOverlay(false);
        } else if (pending.wasPlaying) {
          setShowResumeOverlay(true);
        }
      }

      initMimusicaLibrary(activeToken);
    } else {
      const clientId = GoogleDriveAuth.getStoredClientId();
      if (!clientId && !userHint) {
        setIsLoginOpen(true);
      }
    }
  };

  const initMimusicaLibrary = async (authToken: string) => {
    setFolderNotFound(false);
    setFolderErrorMsg(null);
    try {
      const folderId = await GoogleDriveService.findMimusicaFolder(authToken);
      const fetchedLib = await GoogleDriveService.fetchMimusicaLibrary(authToken, folderId);
      setLibrary(fetchedLib);

      const all: Track[] = [];
      const collect = (f: PlaylistFolder) => {
        all.push(...f.tracks);
        f.subfolders?.forEach(collect);
      };
      collect(fetchedLib);

      if (all.length > 0) {
        setPlaybackState((prev) => ({
          ...prev,
          queue: prev.queue.length > 0 ? prev.queue : all
        }));
      }
    } catch (e: any) {
      console.error('Failed to load Google Drive library:', e);
      if (e.message === 'UNAUTHORIZED') {
        const freshToken = await GoogleDriveAuth.silentRefresh();
        if (freshToken) {
          setToken(freshToken);
          initMimusicaLibrary(freshToken);
          return;
        } else {
          setIsAuthenticated(false);
          setIsLoginOpen(true);
          return;
        }
      }

      setFolderNotFound(true);
      if (e.message === 'FOLDER_NOT_FOUND') {
        const currentEmail = userEmail || GoogleDriveAuth.getStoredEmail() || 'cuenta actual';
        setFolderErrorMsg(`Conectado como ${currentEmail} — No se encontró la carpeta "mimusica" en esta cuenta.`);
      } else {
        setFolderErrorMsg(e.message || 'Error al conectar con Google Drive API');
      }
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    let activeToken = GoogleDriveAuth.getStoredToken();
    if (!activeToken) {
      activeToken = await GoogleDriveAuth.silentRefresh();
    }
    if (activeToken) {
      setToken(activeToken);
      setIsAuthenticated(true);
      await initMimusicaLibrary(activeToken);
    } else {
      setIsLoginOpen(true);
    }
    setIsRetrying(false);
  };

  const handleConnectDrive = async (clientId: string, promptValue?: string) => {
    try {
      const tokenClient = await GoogleDriveAuth.initTokenClient(clientId, async (resp) => {
        if (resp && resp.access_token) {
          setToken(resp.access_token);
          setIsAuthenticated(true);
          const email = GoogleDriveAuth.getStoredEmail();
          const picture = GoogleDriveAuth.getStoredPicture();
          setUserEmail(email);
          setUserPicture(picture);
          initMimusicaLibrary(resp.access_token);
        }
      }, promptValue);
      tokenClient.requestAccessToken({
        prompt: promptValue !== undefined ? promptValue : '',
        hint: GoogleDriveAuth.getUserHint() || undefined
      });
    } catch (e) {
      console.error('Failed to initialize Google token client:', e);
    }
  };

  const handleChangeAccount = () => {
    const clientId = GoogleDriveAuth.getStoredClientId();
    if (clientId) {
      handleConnectDrive(clientId, 'select_account');
    } else {
      setIsLoginOpen(true);
    }
  };

  const handleSelectTrack = async (track: Track, queueList: Track[], enableShuffle?: boolean) => {
    const reqId = ++playRequestIdRef.current;
    setShowResumeOverlay(false);

    const index = queueList.findIndex((t) => t.id === track.id);
    const resolvedIndex = index >= 0 ? index : 0;

    setPlaybackState((prev) => ({
      ...prev,
      currentTrack: track,
      queue: queueList,
      queueIndex: resolvedIndex,
      currentTime: 0,
      isPlaying: true,
      shuffle: enableShuffle !== undefined ? enableShuffle : prev.shuffle
    }));

    persistDriveSession({
      track,
      queue: queueList,
      currentTime: 0,
      wasPlaying: true
    });

    const activeTok = token || GoogleDriveAuth.getStoredToken();

    try {
      const { isOffline } = await audioEngine.playTrack(track, activeTok, settings);
      if (reqId !== playRequestIdRef.current) return;

      setPlaybackState((prev) => ({ ...prev, isPlaying: true, isOffline }));
      audioEngine.prewarmNextTracks(queueList, resolvedIndex, activeTok, settings.bufferAheadCount);
    } catch (e: any) {
      if (reqId !== playRequestIdRef.current) return;
      if (e.message === 'UNAUTHORIZED') {
        const fresh = await GoogleDriveAuth.silentRefresh();
        if (fresh) {
          setToken(fresh);
          setIsAuthenticated(true);
          handleSelectTrack(track, queueList, enableShuffle);
        } else {
          setIsAuthenticated(false);
          setIsLoginOpen(true);
        }
      } else {
        console.error('Play track error:', e);
        setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
      }
    }
  };

  const handleTogglePlay = async () => {
    if (showResumeOverlay && playbackState.currentTrack) {
      await handleResumeNow();
      return;
    }

    if (!playbackState.currentTrack && playbackState.queue.length > 0) {
      await handleSelectTrack(playbackState.queue[0], playbackState.queue);
      if (hasTeslaSession) {
        TeslaFleetService.sendCommand('media_toggle_playback');
      }
      return;
    }

    const playing = audioEngine.togglePlayPause();
    setPlaybackState((prev) => ({ ...prev, isPlaying: playing }));
    persistDriveSession({ wasPlaying: playing });

    if (hasTeslaSession) {
      TeslaFleetService.sendCommand('media_toggle_playback');
    }
  };

  const handleTeslaVolumeDown = () => {
    TeslaFleetService.sendCommand('media_volume_down', 1);
  };

  const handleTeslaVolumeUp = () => {
    TeslaFleetService.sendCommand('media_volume_up', 1);
  };

  const handleNextTrack = async () => {
    const { queue, queueIndex, repeatMode, shuffle } = playbackStateRef.current;
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
        persistDriveSession({ wasPlaying: false });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      const reqId = ++playRequestIdRef.current;
      setShowResumeOverlay(false);
      setPlaybackState((prev) => ({
        ...prev,
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        currentTime: 0,
        isPlaying: true
      }));
      persistDriveSession({
        track: nextTrack,
        queue,
        currentTime: 0,
        wasPlaying: true
      });

      const activeTok = token || GoogleDriveAuth.getStoredToken();
      try {
        const { isOffline } = await audioEngine.playTrack(nextTrack, activeTok, settings);
        if (reqId !== playRequestIdRef.current) return;
        setPlaybackState((prev) => ({ ...prev, isPlaying: true, isOffline }));
        audioEngine.prewarmNextTracks(queue, nextIndex, activeTok, settings.bufferAheadCount);
      } catch (e) {
        console.error('Next track error:', e);
      }
    }
  };

  const handlePrevTrack = async () => {
    const { queue, queueIndex } = playbackStateRef.current;
    if (queue.length === 0) return;

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      const reqId = ++playRequestIdRef.current;
      setShowResumeOverlay(false);
      setPlaybackState((prev) => ({
        ...prev,
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        currentTime: 0,
        isPlaying: true
      }));
      persistDriveSession({
        track: prevTrack,
        queue,
        currentTime: 0,
        wasPlaying: true
      });

      const activeTok = token || GoogleDriveAuth.getStoredToken();
      try {
        const { isOffline } = await audioEngine.playTrack(prevTrack, activeTok, settings);
        if (reqId !== playRequestIdRef.current) return;
        setPlaybackState((prev) => ({ ...prev, isPlaying: true, isOffline }));
      } catch (e) {
        console.error('Prev track error:', e);
      }
    }
  };

  nextTrackRef.current = handleNextTrack;
  prevTrackRef.current = handlePrevTrack;

  const handleSeek = (time: number) => {
    audioEngine.seek(time);
    setPlaybackState((prev) => ({ ...prev, currentTime: time }));
    persistDriveSession({ currentTime: time });
  };

  const handleVolumeChange = (vol: number) => {
    audioEngine.setVolume(vol);
    setPlaybackState((prev) => ({ ...prev, volume: vol }));
  };

  const handleDownloadTrack = async (track: Track) => {
    const activeTok = token || GoogleDriveAuth.getStoredToken();
    if (!activeTok) return;
    try {
      const blob = await GoogleDriveService.fetchAudioBlobWithRetry(track, activeTok);
      await AudioCacheDB.saveBlob(track.id, blob);
      setDownloadedTrackIds((prev) => new Set(prev).add(track.id));
      const size = await AudioCacheDB.getCacheSizeMB();
      setCacheSize(size);
    } catch (e) {
      console.error('Download track failed:', e);
    }
  };

  const handleClearCache = async () => {
    await AudioCacheDB.clearAll();
    setDownloadedTrackIds(new Set());
    const size = await AudioCacheDB.getCacheSizeMB();
    setCacheSize(size);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col transition-colors duration-200 ${
        theme === 'dark'
          ? 'dark bg-[#121316] text-[#F8FAFC]'
          : 'bg-[#F4F6F9] text-[#0F172A]'
      }`}
    >
      <Navbar
        isAuthenticated={isAuthenticated}
        folderName={folderName}
        theme={theme}
        userEmail={userEmail}
        userPicture={userPicture}
        mobileView={mobileView}
        onToggleMobileView={() => setMobileView((prev) => (prev === 'player' ? 'library' : 'player'))}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogin={() => {
          const clientId = GoogleDriveAuth.getStoredClientId();
          if (clientId) {
            handleConnectDrive(clientId);
          } else {
            setIsLoginOpen(true);
          }
        }}
        onChangeAccount={handleChangeAccount}
        onLogout={() => {
          audioEngine.stopAndCleanup();
          GoogleDriveAuth.revokeToken();
          setToken(null);
          setIsAuthenticated(false);
          setUserEmail(null);
          setUserPicture(null);
          setLibrary({ id: 'empty', name: 'mimusica', tracks: [] });
          setPlaybackState((prev) => ({ ...prev, queue: [], currentTrack: null, isPlaying: false }));
          setShowResumeOverlay(false);
        }}
        cacheSize={cacheSize}
      />

      {/* Folder Not Found / API Error Warning Banner */}
      {isAuthenticated && folderNotFound && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-300 dark:border-amber-500/20 px-4 sm:px-6 py-2.5 flex items-center justify-between text-amber-900 dark:text-amber-300 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {folderErrorMsg || `No se encontró la carpeta "mimusica" en la cuenta ${userEmail || 'actual'}.`}
            </span>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-200/80 hover:bg-amber-300/80 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isRetrying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isRetrying ? 'Buscando...' : 'Reintentar'}</span>
          </button>
        </div>
      )}

      {/* Main Responsive Twin-Cabin Grid Layout identical to AudioCar Radio */}
      <main className="flex-1 min-h-0 p-3 sm:p-5 [@media(max-height:750px)]:p-2.5 grid grid-cols-1 min-[1100px]:grid-cols-12 gap-4 sm:gap-5 max-w-[1600px] w-full mx-auto">
        {/* Left Column: Folder Explorer */}
        <div
          className={`min-[1100px]:col-span-5 xl:col-span-5 h-full min-h-0 ${
            mobileView === 'library' ? 'block' : 'hidden min-[1100px]:block'
          }`}
        >
          <FolderExplorer
            library={library}
            currentTrack={playbackState.currentTrack}
            isPlaying={playbackState.isPlaying}
            shuffle={playbackState.shuffle}
            selectedFolderId={activeFolderId}
            onFolderChange={(fId, fName) => {
              setActiveFolderId(fId);
              setFolderName(fName === 'mimusica' ? 'mimusica (Drive)' : fName);
            }}
            onSelectTrack={(track, list, enableShuffle) => {
              handleSelectTrack(track, list, enableShuffle);
            }}
            onDownloadTrack={handleDownloadTrack}
            downloadedTrackIds={downloadedTrackIds}
            onSwitchToPlayer={() => setMobileView('player')}
          />
        </div>

        {/* Right Column: Unified Player Panel identical to AudioCar Radio */}
        <div
          className={`min-[1100px]:col-span-7 xl:col-span-7 h-full min-h-0 ${
            mobileView === 'player' ? 'block' : 'hidden min-[1100px]:block'
          }`}
        >
          <PlayerPanel
            currentTrack={playbackState.currentTrack}
            isPlaying={playbackState.isPlaying}
            currentTime={playbackState.currentTime}
            duration={playbackState.duration}
            volume={playbackState.volume}
            repeatMode={playbackState.repeatMode}
            shuffle={playbackState.shuffle}
            isOffline={playbackState.isOffline}
            eqBands={settings.eqBands}
            hasTeslaSession={hasTeslaSession}
            teslaShiftState={teslaShiftState}
            showResumeOverlay={showResumeOverlay}
            resumeTime={savedResumeTime || playbackState.currentTime}
            onResumeNow={handleResumeNow}
            onTogglePlay={handleTogglePlay}
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleRepeat={() => {
              const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
              const next = modes[(modes.indexOf(playbackState.repeatMode) + 1) % modes.length];
              setPlaybackState((prev) => ({ ...prev, repeatMode: next }));
            }}
            onToggleShuffle={() => setPlaybackState((prev) => ({ ...prev, shuffle: !prev.shuffle }))}
            onTeslaVolumeDown={handleTeslaVolumeDown}
            onTeslaVolumeUp={handleTeslaVolumeUp}
            onOpenFolders={() => setMobileView('library')}
          />
        </div>
      </main>

      {/* Modals */}
      <AudioSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onChangeSettings={(newSet) => {
          setSettings(newSet);
          audioEngine.updateSettings(newSet);
        }}
        onClose={() => setIsSettingsOpen(false)}
        cacheSize={cacheSize}
        onClearCache={handleClearCache}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onConnectDrive={(clientId) => {
          handleConnectDrive(clientId);
        }}
      />
    </div>
  );
}
