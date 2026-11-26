import { TeslaSession } from '../types/audio';

const TESLA_SESSION_KEY = 'audiocar_tesla_session';
const TESLA_FLEET_BASE_URL = 'https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1';

export class TeslaFleetService {
  static getSession(): TeslaSession | null {
    try {
      const raw = localStorage.getItem(TESLA_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.access_token) return null;
      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        expires_at: parsed.expires_at ? Number(parsed.expires_at) : undefined,
        vehicle_id: parsed.vehicle_id || parsed.id || parsed.vin,
        vehicle_name: parsed.vehicle_name || parsed.display_name || 'Tesla'
      };
    } catch (e) {
      console.warn('Invalid audiocar_tesla_session in localStorage:', e);
      return null;
    }
  }

  static saveSession(session: TeslaSession): void {
    try {
      const existingRaw = localStorage.getItem(TESLA_SESSION_KEY);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const merged = { ...existing, ...session };
      localStorage.setItem(TESLA_SESSION_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('Failed to save audiocar_tesla_session:', e);
    }
  }

  /**
   * Checks if the token is about to expire (within 5 minutes) and refreshes it silently
   * via /api/tesla-token with grant_type: 'refresh_token'
   */
  static async ensureValidSession(): Promise<TeslaSession | null> {
    const session = this.getSession();
    if (!session) return null;

    // Handle both millisecond and second timestamps
    let expiresAtMs = session.expires_at;
    if (expiresAtMs && expiresAtMs < 1e12) {
      expiresAtMs = expiresAtMs * 1000;
    }

    const isExpiringSoon = expiresAtMs ? Date.now() >= expiresAtMs - 5 * 60 * 1000 : false;

    if (isExpiringSoon && session.refresh_token) {
      const refreshed = await this.refreshToken(session);
      if (refreshed) return refreshed;
    }

    // Also resolve vehicle_id if missing
    if (!session.vehicle_id) {
      const resolvedId = await this.resolveFirstVehicleId(session.access_token);
      if (resolvedId) {
        session.vehicle_id = resolvedId;
        this.saveSession(session);
      }
    }

    return session;
  }

  static async refreshToken(session: TeslaSession): Promise<TeslaSession | null> {
    if (!session.refresh_token) return session;
    try {
      const res = await fetch('/api/tesla-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: session.refresh_token
        })
      });
      if (!res.ok) return session;
      const data = await res.json();
      if (data && data.access_token) {
        const expiresIn = data.expires_in ? Number(data.expires_in) : 3600;
        const updated: TeslaSession = {
          ...session,
          access_token: data.access_token,
          refresh_token: data.refresh_token || session.refresh_token,
          expires_at: Date.now() + expiresIn * 1000
        };
        this.saveSession(updated);
        return updated;
      }
    } catch (e) {
      console.warn('Silent Tesla token refresh error:', e);
    }
    return session;
  }

  private static async resolveFirstVehicleId(accessToken: string): Promise<string | null> {
    try {
      const res = await fetch(`${TESLA_FLEET_BASE_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const first = data?.response?.[0];
      if (first) {
        return String(first.id_s || first.id || first.vin);
      }
    } catch {
      // ignore
    }
    return null;
  }

  static async sendCommand(
    command: 'media_volume_down' | 'media_volume_up' | 'media_toggle_playback',
    repeatCount = 1
  ): Promise<boolean> {
    const session = await this.ensureValidSession();
    if (!session || !session.vehicle_id) return false;

    const url = `${TESLA_FLEET_BASE_URL}/vehicles/${session.vehicle_id}/command/${command}`;
    let ok = true;

    for (let i = 0; i < repeatCount; i++) {
      try {
        let res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        if (res.status === 401 && session.refresh_token) {
          const refreshed = await this.refreshToken(session);
          if (refreshed) {
            res = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${refreshed.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({})
            });
          }
        }

        if (!res.ok) {
          ok = false;
        }
      } catch (e) {
        console.warn(`Tesla command ${command} failed:`, e);
        ok = false;
      }

      if (repeatCount > 1 && i < repeatCount - 1) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    return ok;
  }

  static async getShiftState(): Promise<{ shift_state: string | null; speed: number }> {
    const session = await this.ensureValidSession();
    if (!session || !session.vehicle_id) {
      return { shift_state: null, speed: 0 };
    }

    const url = `${TESLA_FLEET_BASE_URL}/vehicles/${session.vehicle_id}/vehicle_data?endpoints=drive_state`;
    try {
      let res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (res.status === 401 && session.refresh_token) {
        const refreshed = await this.refreshToken(session);
        if (refreshed) {
          res = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${refreshed.access_token}`
            }
          });
        }
      }

      if (!res.ok) return { shift_state: null, speed: 0 };
      const data = await res.json();
      const driveState = data?.response?.drive_state;
      return {
        shift_state: driveState?.shift_state ?? null,
        speed: Number(driveState?.speed || 0)
      };
    } catch (e) {
      console.warn('Tesla drive_state poll error:', e);
      return { shift_state: null, speed: 0 };
    }
  }
}
