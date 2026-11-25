import { Track, PlaylistFolder } from '../types/audio';

const CLIENT_ID_KEY = 'audiocar_google_client_id';
const TOKEN_KEY = 'audiocar_google_access_token';
const MUSIC_FOLDER_ID_KEY = 'audiocar_music_folder_id';

// Sample demo tracks for out-of-the-box demo testing
export const DEMO_TRACKS: Track[] = [
  {
    id: 'demo-1',
    name: 'Midnight Drive (Synthwave Remix)',
    mimeType: 'audio/mp3',
    downloadUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf756.mp3?filename=synthwave-80s-110530.mp3',
    artist: 'Neon Horizon',
    album: 'Cyber Highway',
    duration: 184,
    offlineReady: true
  },
  {
    id: 'demo-2',
    name: 'Coastal Cruise (Chillout Lo-Fi)',
    mimeType: 'audio/mp3',
    downloadUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lofi-study-112191.mp3',
    artist: 'Pacific Coast',
    album: 'Sunset Sessions',
    duration: 152,
    offlineReady: true
  },
  {
    id: 'demo-3',
    name: 'Mountain Pass (Ambient Electronic)',
    mimeType: 'audio/mp3',
    downloadUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=ambient-space-12349.mp3',
    artist: 'Altitude',
    album: 'Elevation',
    duration: 210,
    offlineReady: false
  },
  {
    id: 'demo-4',
    name: 'Electric Speed (Synth Rock)',
    mimeType: 'audio/mp3',
    downloadUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=energetic-rock-103314.mp3',
    artist: 'Voltage',
    album: 'Full Throttle',
    duration: 165,
    offlineReady: false
  }
];

export const DEMO_PLAYLISTS: PlaylistFolder[] = [
  {
    id: 'demo-folder-1',
    name: 'Mi música (Demo)',
    tracks: DEMO_TRACKS,
    subfolders: [
      {
        id: 'demo-folder-2',
        name: 'Roadtrip 2026',
        tracks: [DEMO_TRACKS[0], DEMO_TRACKS[1]]
      },
      {
        id: 'demo-folder-3',
        name: 'Night Driving',
        tracks: [DEMO_TRACKS[2], DEMO_TRACKS[3]]
      }
    ]
  }
];

export class GoogleDriveService {
  static getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  static setStoredToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  static clearStoredToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MUSIC_FOLDER_ID_KEY);
  }

  static getStoredClientId(): string | null {
    return localStorage.getItem(CLIENT_ID_KEY);
  }

  static setStoredClientId(clientId: string): void {
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  static async findOrCreateMusicFolder(token: string): Promise<string> {
    const storedFolderId = localStorage.getItem(MUSIC_FOLDER_ID_KEY);
    if (storedFolderId) return storedFolderId;

    try {
      // Search for folder named "Mi música"
      const query = encodeURIComponent("name = 'Mi música' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to search Drive folders');
      const data = await res.json();
      
      if (data.files && data.files.length > 0) {
        const folderId = data.files[0].id;
        localStorage.setItem(MUSIC_FOLDER_ID_KEY, folderId);
        return folderId;
      }

      // Create "Mi música" folder if not found
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Mi música',
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      if (!createRes.ok) throw new Error('Failed to create "Mi música" folder');
      const folderData = await createRes.json();
      localStorage.setItem(MUSIC_FOLDER_ID_KEY, folderData.id);
      return folderData.id;
    } catch (err) {
      console.warn('Google Drive folder operation error:', err);
      throw err;
    }
  }

  static async fetchLibrary(token: string, folderId: string): Promise<PlaylistFolder> {
    try {
      // Fetch files inside folder (audio files and subfolders)
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,modifiedTime,webContentLink)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to list files in Google Drive');
      const data = await res.json();
      
      const tracks: Track[] = [];
      const subfolderPromises: Promise<PlaylistFolder>[] = [];

      for (const file of (data.files || [])) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          subfolderPromises.push(this.fetchLibrary(token, file.id));
        } else if (
          file.mimeType?.startsWith('audio/') ||
          file.name.match(/\.(mp3|flac|wav|m4a|ogg)$/i)
        ) {
          tracks.push({
            id: file.id,
            name: file.name.replace(/\.[^/.]+$/, ''),
            mimeType: file.mimeType || 'audio/mp3',
            size: file.size ? Number(file.size) : undefined,
            modifiedTime: file.modifiedTime,
            downloadUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            webContentLink: file.webContentLink,
            parentId: folderId
          });
        }
      }

      const subfolders = await Promise.all(subfolderPromises);

      return {
        id: folderId,
        name: 'Mi música',
        tracks,
        subfolders
      };
    } catch (err) {
      console.warn('Failed to fetch Google Drive library, falling back to demo library:', err);
      return DEMO_PLAYLISTS[0];
    }
  }

  static async fetchAudioBlobWithRetry(track: Track, token: string | null): Promise<Blob> {
    const url = track.downloadUrl || (track.id.startsWith('demo-') ? track.downloadUrl : `https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`);
    if (!url) throw new Error('No download URL available for track');

    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const headers: HeadersInit = {};
        if (token && !track.id.startsWith('demo-')) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const blob = await res.blob();
        return blob;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2; // exponential backoff
      }
    }
    throw new Error('Failed to fetch audio blob after retries');
  }
}
