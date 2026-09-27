/** authApi — Google-bridge + backend session endpoints. */

import { apiRequest } from './client';
import type { GoogleProfile, TokenPair, User, UserProfile, UserPreferences } from './types';

const PREFS_KEY = 'saatraai.profile.preferences';
const NEW_FLAG_KEY = 'saatraai.profile.is-new';

export interface GoogleBridgeResponse extends TokenPair {
  user: User;
  google: GoogleProfile;
}

async function exchangeGoogleCredential(credential: string): Promise<GoogleBridgeResponse> {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const data = (await response.json().catch(() => null)) as
    | (GoogleBridgeResponse & { error?: string; detail?: string })
    | null;
  if (!response.ok || !data || 'error' in (data ?? {})) {
    throw new Error(
      data?.detail ?? data?.error ?? `Google sign-in failed (${response.status})`,
    );
  }
  return data;
}

export const authApi = {
  /** Google ID token → verified profile → backend JWT pair. */
  signInWithGoogle: exchangeGoogleCredential,

  async me(): Promise<User | null> {
    return apiRequest<User | null>('/users/me', { nullOn404: true });
  },

  async register(email: string, password: string, displayName?: string): Promise<User> {
    return apiRequest<User>('/auth/register', {
      method: 'POST',
      body: { email, password, display_name: displayName },
      auth: false,
    });
  },

  async login(email: string, password: string): Promise<TokenPair> {
    return apiRequest<TokenPair>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    return apiRequest<TokenPair>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      auth: false,
    });
  },
};

/* ── First-run profile preferences (device-local; backend stores identity only) ── */

export function readPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as UserPreferences) : null;
  } catch {
    return null;
  }
}

export function writePreferences(prefs: UserPreferences): void {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function profileCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(NEW_FLAG_KEY) === '1';
}

export function markProfileCompleted(): void {
  window.localStorage.setItem(NEW_FLAG_KEY, '1');
}

export function resetProfileFlags(): void {
  window.localStorage.removeItem(NEW_FLAG_KEY);
  window.localStorage.removeItem(PREFS_KEY);
}

export type { UserProfile };
