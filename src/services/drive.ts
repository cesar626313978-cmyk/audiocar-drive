import { Track, PlaylistFolder } from '../types/audio';

const TOKEN_KEY = 'audiocar_access_token';
const EXPIRES_KEY = 'audiocar_expires_at';
const EMAIL_KEY = 'audiocar_user_email';
const PICTURE_KEY = 'audiocar_user_picture';
const FOLDER_ID_KEY = 'audiocar_mimusica_folder_id';
const CLIENT_ID_KEY = 'audiocar_client_id';

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email';

export class GoogleDriveAuth {
  private static tokenClient: any = null;

  static getStoredToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(EXPIRES_KEY) || 0);
    if (!token || Date.now() >= expiresAt) {
      return null;
    }
    return token;
  }

  static getStoredEmail(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  }

  static getStoredPicture(): string | null {
    return localStorage.getItem(PICTURE_KEY);
  }

  static getStoredClientId(): string {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem(CLIENT_ID_KEY) || '';
  }

  static setStoredClientId(clientId: string): void {
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  static clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(PICTURE_KEY);
    localStorage.removeItem(FOLDER_ID_KEY);
  }

  static async loadGISScript(): Promise<void> {
    if ((window as any).google?.accounts?.oauth2) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  static async initTokenClient(clientId: string, callback: (resp: any) => void, promptValue?: string): Promise<any> {
    await this.loadGISScript();
    const google = (window as any).google;
    if (!google || !google.accounts) throw new Error('Google Identity Services failed to load');

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      prompt: promptValue || '',
      callback: async (resp: any) => {
        if (resp && resp.access_token) {
          const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3600;
          const expiresAt = Date.now() + expiresIn * 1000 - 300000; // 5 min buffer
          localStorage.setItem(TOKEN_KEY, resp.access_token);
          localStorage.setItem(EXPIRES_KEY, expiresAt.toString());
          
          await this.fetchUserInfo(resp.access_token);
        }
        callback(resp);
      }
    });
    return this.tokenClient;
  }

  static async fetchUserInfo(token: string): Promise<{ email: string | null; picture: string | null }> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return { email: null, picture: null };
      const data = await res.json();
      if (data.email) {
        localStorage.setItem(EMAIL_KEY, data.email);
      }
      if (data.picture) {
        localStorage.setItem(PICTURE_KEY, data.picture);
      }
      return { email: data.email || null, picture: data.picture || null };
    } catch (e) {
      console.warn('Failed to fetch userinfo:', e);
      return { email: null, picture: null };
    }
  }

  static async silentRefresh(): Promise<string | null> {
    const clientId = this.getStoredClientId();
    const email = this.getStoredEmail();
    if (!clientId) return null;

    try {
      await this.loadGISScript();
      const google = (window as any).google;
      return new Promise((resolve) => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: async (resp: any) => {
            if (resp && resp.access_token) {
              const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3600;
              const expiresAt = Date.now() + expiresIn * 1000 - 300000;
              localStorage.setItem(TOKEN_KEY, resp.access_token);
              localStorage.setItem(EXPIRES_KEY, expiresAt.toString());
              await this.fetchUserInfo(resp.access_token);
              resolve(resp.access_token);
            } else {
              resolve(null);
            }
          }
        });
        client.requestAccessToken({ prompt: '', hint: email || undefined });
      });
    } catch {
      return null;
    }
  }

  static revokeToken(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const google = (window as any).google;
    if (token && google?.accounts?.oauth2) {
      google.accounts.oauth2.revoke(token, () => {
        console.log('Token revoked');
      });
    }
    this.clearSession();
  }
}

export class GoogleDriveService {
  static async findMimusicaFolder(token: string): Promise<string> {
    const q = encodeURIComponent("name = 'mimusica' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,parents)&spaces=drive`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      let errorMsg = `Error ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error && errJson.error.message) {
          errorMsg = `Error ${res.status}: ${errJson.error.message}`;
        }
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const files = data.files || [];
    const match = files.find((f: any) => f.name.toLowerCase().replace(/\s+/g, '') === 'mimusica');

    if (!match) {
      throw new Error('FOLDER_NOT_FOUND');
    }

    localStorage.setItem(FOLDER_ID_KEY, match.id);
    return match.id;
  }

  static async fetchMimusicaLibrary(token: string, folderId: string): Promise<PlaylistFolder> {
    try {
      const subfolders = await this.fetchFolderRecursive(token, folderId);
      
      // Collect root tracks + subfolders tracks
      const rootTracks = subfolders.tracks || [];
      const allSubfolders = subfolders.subfolders || [];

      return {
        id: folderId,
        name: 'mimusica',
        tracks: rootTracks,
        subfolders: allSubfolders
      };
    } catch (e) {
      console.error('Failed to fetch mimusica library:', e);
      throw e;
    }
  }

  private static async fetchFolderRecursive(token: string, folderId: string, currentFolderName = 'mimusica'): Promise<PlaylistFolder> {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,modifiedTime)&includeItemsFromAllDrives=true&supportsAllDrives=true&pageSize=500`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { id: folderId, name: currentFolderName, tracks: [] };
    const data = await res.json();

    const tracks: Track[] = [];
    const subfolderPromises: Promise<PlaylistFolder>[] = [];

    for (const file of (data.files || [])) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        subfolderPromises.push(this.fetchFolderRecursive(token, file.id, file.name));
      } else if (
        file.mimeType?.includes('audio') ||
        file.name.match(/\.(mp3|flac|wav|m4a|ogg)$/i)
      ) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        tracks.push({
          id: file.id,
          name: cleanName,
          mimeType: file.mimeType || 'audio/mpeg',
          size: file.size ? Number(file.size) : undefined,
          modifiedTime: file.modifiedTime,
          downloadUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          parentId: folderId,
          album: currentFolderName === 'mimusica' ? 'mimusica' : currentFolderName,
          artist: currentFolderName === 'mimusica' ? 'Google Drive' : currentFolderName
        });
      }
    }

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    tracks.sort((a, b) => collator.compare(a.name, b.name));

    const subfolders = await Promise.all(subfolderPromises);
    subfolders.sort((a, b) => collator.compare(a.name, b.name));

    return {
      id: folderId,
      name: currentFolderName,
      tracks,
      subfolders
    };
  }

  static async fetchAudioBlobWithRetry(track: Track, token: string | null): Promise<Blob> {
    const url = track.downloadUrl;
    if (!url) throw new Error('No download URL available');

    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.blob();
      } catch (err) {
        if ((err as Error).message === 'UNAUTHORIZED') throw err;
        retries--;
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
    throw new Error('Failed to fetch audio blob');
  }
}
