import { Track, PlaylistFolder } from '../types/audio';

const TOKEN_KEY = 'audiocar_access_token';
const EXPIRES_KEY = 'audiocar_expires_at';
const EMAIL_KEY = 'audiocar_user_email';
const FOLDER_ID_KEY = 'audiocar_mimusica_folder_id';
const CLIENT_ID_KEY = 'audiocar_client_id';

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

  static async initTokenClient(clientId: string, callback: (resp: any) => void): Promise<any> {
    await this.loadGISScript();
    const google = (window as any).google;
    if (!google || !google.accounts) throw new Error('Google Identity Services failed to load');

    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (resp: any) => {
        if (resp && resp.access_token) {
          const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3600;
          const expiresAt = Date.now() + expiresIn * 1000 - 300000; // 5 min buffer for silent renewal
          localStorage.setItem(TOKEN_KEY, resp.access_token);
          localStorage.setItem(EXPIRES_KEY, expiresAt.toString());
          
          // Fetch user info
          this.fetchUserInfo(resp.access_token);
        }
        callback(resp);
      }
    });
    return this.tokenClient;
  }

  static async fetchUserInfo(token: string): Promise<string | null> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.email) {
        localStorage.setItem(EMAIL_KEY, data.email);
        return data.email;
      }
    } catch (e) {
      console.warn('Failed to fetch userinfo:', e);
    }
    return null;
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
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (resp: any) => {
            if (resp && resp.access_token) {
              const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3600;
              const expiresAt = Date.now() + expiresIn * 1000 - 300000;
              localStorage.setItem(TOKEN_KEY, resp.access_token);
              localStorage.setItem(EXPIRES_KEY, expiresAt.toString());
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
  static async findMimusicaFolder(token: string): Promise<string | null> {
    const stored = localStorage.getItem(FOLDER_ID_KEY);
    if (stored) return stored;

    try {
      const query = encodeURIComponent("name = 'mimusica' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Drive API error');
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        const folderId = data.files[0].id;
        localStorage.setItem(FOLDER_ID_KEY, folderId);
        return folderId;
      }
    } catch (e) {
      console.warn('Error searching for mimusica folder:', e);
    }
    return null;
  }

  static async fetchMimusicaLibrary(token: string, folderId: string): Promise<PlaylistFolder> {
    try {
      // Fetch subfolders and audio files inside mimusica
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,modifiedTime)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to list files');
      const data = await res.json();

      const tracks: Track[] = [];
      const subfolderPromises: Promise<PlaylistFolder>[] = [];

      for (const file of (data.files || [])) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          subfolderPromises.push(this.fetchSubfolderLibrary(token, file.id, file.name));
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
            parentId: folderId
          });
        }
      }

      const subfolders = await Promise.all(subfolderPromises);

      return {
        id: folderId,
        name: 'mimusica',
        tracks,
        subfolders
      };
    } catch (e) {
      console.error('Failed to fetch mimusica library:', e);
      throw e;
    }
  }

  private static async fetchSubfolderLibrary(token: string, folderId: string, folderName: string): Promise<PlaylistFolder> {
    try {
      const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,modifiedTime)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return { id: folderId, name: folderName, tracks: [] };
      const data = await res.json();

      const tracks: Track[] = [];
      for (const file of (data.files || [])) {
        if (
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
            parentId: folderId
          });
        }
      }

      return {
        id: folderId,
        name: folderName,
        tracks
      };
    } catch {
      return { id: folderId, name: folderName, tracks: [] };
    }
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
          // Token expired or invalid
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
