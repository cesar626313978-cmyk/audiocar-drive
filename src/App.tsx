import React, { useState, useEffect, useRef } from 'react';
import { Track, PlaylistFolder, AudioSettings, PlaybackState } from './types/audio';
import { GoogleDriveAuth, GoogleDriveService } from './services/drive';
import { TeslaFleetService } from './services/tesla';
import { audioEngine } from './services/audioEngine';
import { AudioCacheDB } from './services/db';
import { Navbar } from './components/Navbar';
import { FolderExplorer } from './components/FolderExplorer';
import { PlayerPanel } from './components/PlayerPanel';
import { DrivingHUD } from './components/DrivingHUD';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { LoginModal } from './components/LoginModal';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPicture, setUserPicture] = useState<string | null>(null);
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

  // Dual view switcher for screens < 1100px (Tesla Drive Split-Screen)
  const [mobileView, setMobileView] = useState<'player' | 'library'>('library');

  // Tesla Fleet API Session & Shift State
  const [hasTeslaSession, setHasTeslaSession] = useState<boolean>(false);
  const [teslaShiftState, setTeslaShiftState] = useState<string | null>(null);
  const isReverseDimmedRef = useRef<boolean>(false);
  const nextTrackRef = useRef<() => void>(() => {});
  const prevTrackRef = useRef<() => void>(() => {});

  // Initialize single exclusive audio engine, MediaSession, and hide any external Hub mini-player on mount
  useEffect(() => {
    audioEngine.stopAllOtherAudioSources();

    // Hide any persistent mini-player inherited from parent Hub layout if present in DOM
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
        setPlaybackState(prev => ({ ...prev, currentTime: time, duration: duration || prev.duration }));
      },
      () => {
        nextTrackRef.current();
      },
      (isPlaying) => {
        setPlaybackState(prev => ({ ...prev, isPlaying }));
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

    // Attempt autoconnection / silent renewal for Google Drive
    checkAndRestoreSession();

    // Check shared Tesla Fleet API session in localStorage ('audiocar_tesla_session')
    const checkTeslaSession = () => {
      const session = TeslaFleetService.getSession();
      setHasTeslaSession(Boolean(session && session.access_token));
    };
    checkTeslaSession();
    window.addEventListener('storage', checkTeslaSession);

    // Global postMessage listener for parent Launcher volume commands ({ type: 'AUDIOCAR_SET_VOLUME', level })
    const handleLauncherMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'AUDIOCAR_SET_VOLUME') {
        const level = Math.max(0, Math.min(1, Number(event.data.level)));
        if (!isNaN(level)) {
          audioEngine.setVolume(level);
          setPlaybackState(prev => ({ ...prev, volume: level }));
        }
      }
    };
    window.addEventListener('message', handleLauncherMessage);

    return () => {
      window.removeEventListener('storage', checkTeslaSession);
      window.removeEventListener('message', handleLauncherMessage);
    };
  }, []);

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
    if (!activeToken) {
      activeToken = await GoogleDriveAuth.silentRefresh();
    }

    if (activeToken) {
      setToken(activeToken);
      setIsAuthenticated(true);
      setUserEmail(GoogleDriveAuth.getStoredEmail());
      setUserPicture(GoogleDriveAuth.getStoredPicture());
      initMimusicaLibrary(activeToken);
    } else {
      const clientId = GoogleDriveAuth.getStoredClientId();
      if (!clientId) {
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
        setPlaybackState(prev => ({ ...prev, queue: all }));
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
      tokenClient.requestAccessToken({ prompt: promptValue || '' });
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
    const index = queueList.findIndex(t => t.id === track.id);
    setPlaybackState(prev => ({
      ...prev,
      currentTrack: track,
      queue: queueList,
      queueIndex: index >= 0 ? index : 0,
      shuffle: enableShuffle !== undefined ? enableShuffle : prev.shuffle
    }));

    if (!token) return;

    try {
      await audioEngine.playTrack(track, token, settings);
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
      audioEngine.prewarmNextTracks(queueList, index >= 0 ? index : 0, token, settings.bufferAheadCount);
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        const fresh = await GoogleDriveAuth.silentRefresh();
        if (fresh) {
          setToken(fresh);
          handleSelectTrack(track, queueList, enableShuffle);
        } else {
          setIsAuthenticated(false);
          setIsLoginOpen(true);
        }
      } else {
        console.error('Play track error:', e);
      }
    }
  };

  const handleTogglePlay = async () => {
    if (!playbackState.currentTrack && playbackState.queue.length > 0) {
      await handleSelectTrack(playbackState.queue[0], playbackState.queue);
      if (hasTeslaSession) {
        TeslaFleetService.sendCommand('media_toggle_playback');
      }
      return;
    }
    const playing = audioEngine.togglePlayPause();
    setPlaybackState(prev => ({ ...prev, isPlaying: playing }));
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
    const { queue, queueIndex, repeatMode, shuffle } = playbackState;
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      setPlaybackState(prev => ({ ...prev, currentTrack: nextTrack, queueIndex: nextIndex }));
      try {
        await audioEngine.playTrack(nextTrack, token, settings);
        audioEngine.prewarmNextTracks(queue, nextIndex, token, settings.bufferAheadCount);
      } catch (e) {
        console.error('Next track error:', e);
      }
    }
  };

  const handlePrevTrack = async () => {
    const { queue, queueIndex } = playbackState;
    if (queue.length === 0) return;

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      setPlaybackState(prev => ({ ...prev, currentTrack: prevTrack, queueIndex: prevIndex }));
      try {
        await audioEngine.playTrack(prevTrack, token, settings);
      } catch (e) {
        console.error('Prev track error:', e);
      }
    }
  };

  nextTrackRef.current = handleNextTrack;
  prevTrackRef.current = handlePrevTrack;

  const handleSeek = (time: number) => {
    audioEngine.seek(time);
    setPlaybackState(prev => ({ ...prev, currentTime: time }));
  };

  const handleVolumeChange = (vol: number) => {
    audioEngine.setVolume(vol);
    setPlaybackState(prev => ({ ...prev, volume: vol }));
  };

  const handleDownloadTrack = async (track: Track) => {
    if (!token) return;
    try {
      const blob = await GoogleDriveService.fetchAudioBlobWithRetry(track, token);
      await AudioCacheDB.saveBlob(track.id, blob);
      setDownloadedTrackIds(prev => new Set(prev).add(track.id));
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

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className={`h-screen overflow-hidden flex flex-col ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar
        isAuthenticated={isAuthenticated}
        folderName={folderName}
        theme={theme}
        userEmail={userEmail}
        userPicture={userPicture}
        mobileView={mobileView}
        onToggleMobileView={() => setMobileView(prev => (prev === 'player' ? 'library' : 'player'))}
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
          setPlaybackState(prev => ({ ...prev, queue: [], currentTrack: null, isPlaying: false }));
        }}
        cacheSize={cacheSize}
      />

      {/* Folder Not Found / API Error Warning Banner */}
      {isAuthenticated && folderNotFound && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2.5 flex items-center justify-between text-amber-300 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {folderErrorMsg || `No se encontró la carpeta "mimusica" en la cuenta ${userEmail || 'actual'}.`}
            </span>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isRetrying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isRetrying ? 'Buscando...' : 'Reintentar'}</span>
          </button>
        </div>
      )}

      {/* Main Responsive Grid Layout:
          - Desktop / Tesla Park (>= 1100px): 2 columns side-by-side
          - Tesla Drive Split-Screen (< 1100px): Full-width toggle between Library & Player
          - Single fixed bottom footer (DrivingHUD) across all viewports */}
      <main className="flex-1 min-h-0 p-3 sm:p-5 [@media(max-height:750px)]:p-2.5 grid grid-cols-1 min-[1100px]:grid-cols-12 gap-4 sm:gap-6 max-w-[1600px] w-full mx-auto pb-28">
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
            onSelectTrack={(track, list, enableShuffle) => {
              handleSelectTrack(track, list, enableShuffle);
            }}
            onDownloadTrack={handleDownloadTrack}
            downloadedTrackIds={downloadedTrackIds}
            onSwitchToPlayer={() => setMobileView('player')}
          />
        </div>

        {/* Right Column: Player Panel (Artwork & Visualizer only, zero duplicate controls) */}
        <div
          className={`min-[1100px]:col-span-7 xl:col-span-7 h-full min-h-0 ${
            mobileView === 'player' ? 'block' : 'hidden min-[1100px]:block'
          }`}
        >
          <PlayerPanel
            currentTrack={playbackState.currentTrack}
            isPlaying={playbackState.isPlaying}
            isOffline={playbackState.isOffline}
            hasTeslaSession={hasTeslaSession}
            teslaShiftState={teslaShiftState}
            onOpenFolders={() => setMobileView('library')}
          />
        </div>
      </main>

      {/* Single Fixed Bottom Player Footer for AudioCar Drive */}
      <DrivingHUD
        currentTrack={playbackState.currentTrack}
        isPlaying={playbackState.isPlaying}
        currentTime={playbackState.currentTime}
        duration={playbackState.duration}
        volume={playbackState.volume}
        repeatMode={playbackState.repeatMode}
        shuffle={playbackState.shuffle}
        isOffline={playbackState.isOffline}
        mobileView={mobileView}
        hasTeslaSession={hasTeslaSession}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleRepeat={() => {
          const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
          const next = modes[(modes.indexOf(playbackState.repeatMode) + 1) % modes.length];
          setPlaybackState(prev => ({ ...prev, repeatMode: next }));
        }}
        onToggleShuffle={() => setPlaybackState(prev => ({ ...prev, shuffle: !prev.shuffle }))}
        onToggleMobileView={() => setMobileView(prev => (prev === 'player' ? 'library' : 'player'))}
        onTeslaVolumeDown={handleTeslaVolumeDown}
        onTeslaVolumeUp={handleTeslaVolumeUp}
      />

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
