export interface Track {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  downloadUrl?: string;
  webContentLink?: string;
  parentId?: string;
  duration?: number;
  offlineReady?: boolean;
  artist?: string;
  album?: string;
}

export interface PlaylistFolder {
  id: string;
  name: string;
  parentId?: string;
  tracks: Track[];
  subfolders?: PlaylistFolder[];
}

export interface AudioSettings {
  crossfadeSeconds: number; // 0 to 12
  agcEnabled: boolean; // Dynamic Range Compressor
  eqBands: {
    bass: number; // -12 to +12 dB
    mid: number;
    treble: number;
  };
  bufferAheadCount: number; // 1, 3, or 5 tracks
  theme: 'dark' | 'light' | 'auto';
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  isOffline: boolean;
  activePlayer: 'A' | 'B';
  volume: number;
}
