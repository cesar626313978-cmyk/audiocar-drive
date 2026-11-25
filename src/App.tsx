import React, { useState, useEffect, useRef } from 'react';
import { Track, PlaylistFolder, AudioSettings, PlaybackState } from './types/audio';
import { GoogleDriveService, DEMO_PLAYLISTS, DEMO_TRACKS } from './services/drive';
import { audioEngine } from './services/audioEngine';
import { AudioCacheDB } from './services/db';
import { Navbar } from './components/Navbar';
import { FolderExplorer } from './components/FolderExplorer';
import { PlayerPanel } from './components/PlayerPanel';
import { DrivingHUD } from './components/DrivingHUD';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { LoginModal } from './components/LoginModal';
import { Menu, X } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('Mi música (Demo)');
  const [library, setLibrary] = useState<PlaylistFolder>(DEMO_PLAYLISTS[0]);
  const [cacheSize, setCacheSize] = useState<string>('0.0');

  const [settings, setSettings] = useState<AudioSettings>({
    crossfadeSeconds: 4,
    agcEnabled: true,
    eqBands: { bass: 2, mid: 0, treble: 1 },
    bufferAheadCount: 3,
    theme: 'dark'
  });

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
    queue: DEMO_TRACKS,
    queueIndex: 0,
    repeatMode: 'off',
    shuffle: false,
    isOffline: true,
    activePlayer: 'A',
    volume: 0.8
  });

  const [downloadedTrackIds, setDownloadedTrackIds] = useState<Set<string>>(new Set(['demo-1', 'demo-2']));
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Initialize audio engine callbacks and settings
  useEffect(() => {
    audioEngine.setCallbacks(
      (time, duration) => {
        setPlaybackState(prev => ({ ...prev, currentTime: time, duration: duration || prev.duration }));
      },
      () => {
        handleNextTrack();
      },
      (isPlaying) => {
        setPlaybackState(prev => ({ ...prev, isPlaying }));
      }
    );

    audioEngine.updateSettings(settings);

    // Load cache size
    AudioCacheDB.getCacheSizeMB().then(setCacheSize);

    // Check stored token or default to demo
    const storedToken = GoogleDriveService.getStoredToken();
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      setIsDemoMode(false);
      initDriveLibrary(storedToken);
    }
  }, []);

  const initDriveLibrary = async (authToken: string) => {
    try {
      const folderId = await GoogleDriveService.findOrCreateMusicFolder(authToken);
      const fetchedLib = await GoogleDriveService.fetchLibrary(authToken, folderId);
      setLibrary(fetchedLib);
      setFolderName('Mi música');
      const all: Track[] = [];
      const collect = (f: PlaylistFolder) => {
        all.push(...f.tracks);
        f.subfolders?.forEach(collect);
      };
      collect(fetchedLib);
      if (all.length > 0) {
        setPlaybackState(prev => ({ ...prev, queue: all }));
      }
    } catch (e) {
      console.warn('Failed to load Google Drive library:', e);
    }
  };

  const handleSelectTrack = async (track: Track, queueList: Track[]) => {
    const index = queueList.findIndex(t => t.id === track.id);
    setPlaybackState(prev => ({
      ...prev,
      currentTrack: track,
      queue: queueList,
      queueIndex: index >= 0 ? index : 0
    }));

    try {
      await audioEngine.playTrack(track, token, settings);
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
      // Pre-warm ahead
      audioEngine.prewarmNextTracks(queueList, index >= 0 ? index : 0, token, settings.bufferAheadCount);
    } catch (e) {
      console.error('Play track error:', e);
    }
  };

  const handleTogglePlay = async () => {
    if (!playbackState.currentTrack && playbackState.queue.length > 0) {
      await handleSelectTrack(playbackState.queue[0], playbackState.queue);
      return;
    }
    const playing = audioEngine.togglePlayPause();
    setPlaybackState(prev => ({ ...prev, isPlaying: playing }));
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
        return; // stop at end
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

  const handleSeek = (time: number) => {
    audioEngine.seek(time);
    setPlaybackState(prev => ({ ...prev, currentTime: time }));
  };

  const handleVolumeChange = (vol: number) => {
    audioEngine.setVolume(vol);
    setPlaybackState(prev => ({ ...prev, volume: vol }));
  };

  const handleDownloadTrack = async (track: Track) => {
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
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar
        isAuthenticated={isAuthenticated}
        folderName={folderName}
        isDemoMode={isDemoMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={() => {
          GoogleDriveService.clearStoredToken();
          setToken(null);
          setIsAuthenticated(false);
          setIsDemoMode(true);
          setLibrary(DEMO_PLAYLISTS[0]);
          setFolderName('Mi música (Demo)');
        }}
        cacheSize={cacheSize}
      />

      {/* Main Responsive Grid Layout (Tesla Park / Desktop vs Drive) */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto pb-24 lg:pb-6">
        {/* Left Column: Folder Explorer (Hidden on mobile unless toggled) */}
        <div className={`lg:col-span-5 xl:col-span-4 h-[calc(100vh-140px)] ${isMobileDrawerOpen ? 'fixed inset-x-4 top-20 z-50 bg-slate-950/95 p-4 rounded-3xl border border-slate-800 shadow-2xl' : 'hidden lg:block'}`}>
          {isMobileDrawerOpen && (
            <div className="flex justify-between items-center mb-4 lg:hidden">
              <h3 className="font-bold text-white">Music Library</h3>
              <button onClick={() => setIsMobileDrawerOpen(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <FolderExplorer
            library={library}
            currentTrack={playbackState.currentTrack}
            isPlaying={playbackState.isPlaying}
            onSelectTrack={(track, list) => {
              handleSelectTrack(track, list);
              setIsMobileDrawerOpen(false);
            }}
            onDownloadTrack={handleDownloadTrack}
            downloadedTrackIds={downloadedTrackIds}
          />
        </div>

        {/* Right Column: Player Panel */}
        <div className="lg:col-span-7 xl:col-span-8 h-[calc(100vh-140px)]">
          <PlayerPanel
            currentTrack={playbackState.currentTrack}
            isPlaying={playbackState.isPlaying}
            currentTime={playbackState.currentTime}
            duration={playbackState.duration}
            volume={playbackState.volume}
            repeatMode={playbackState.repeatMode}
            shuffle={playbackState.shuffle}
            isOffline={playbackState.isOffline}
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
          />
        </div>
      </main>

      {/* Tesla Drive Mode Compact HUD (Viewports ≤ 900px) */}
      <DrivingHUD
        currentTrack={playbackState.currentTrack}
        isPlaying={playbackState.isPlaying}
        currentTime={playbackState.currentTime}
        duration={playbackState.duration}
        isOffline={playbackState.isOffline}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onOpenFolderDrawer={() => setIsMobileDrawerOpen(true)}
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
        onLoginWithToken={(tok) => {
          GoogleDriveService.setStoredToken(tok);
          setToken(tok);
          setIsAuthenticated(true);
          setIsDemoMode(false);
          initDriveLibrary(tok);
        }}
        onEnableDemoMode={() => {
          setIsDemoMode(true);
          setIsAuthenticated(false);
          setLibrary(DEMO_PLAYLISTS[0]);
          setFolderName('Mi música (Demo)');
          setPlaybackState(prev => ({ ...prev, queue: DEMO_TRACKS }));
        }}
      />
    </div>
  );
}
