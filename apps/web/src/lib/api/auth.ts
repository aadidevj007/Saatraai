/** authApi — Google identity, Firebase verification, and backend sessions. */

import type { GoogleProfile, TokenPair, User, UserProfile, UserPreferences } from './types';
import { apiRequest } from './client';

const PREFS_KEY = 'saatraai.profile.preferences';
const NEW_FLAG_KEY = 'saatraai.profile.is-new';

export interface GoogleBridgeResponse extends TokenPair {
  user: User;
  google: GoogleProfile;
}

interface FirebaseIdentityResponse {
  idToken: string;
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

interface FirebaseSessionResponse extends TokenPair {
  firebase_uid: string;
  user: User;
}

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function exchangeGoogleCredentialForFirebase(credential: string): Promise<GoogleBridgeResponse> {
  if (!FIREBASE_API_KEY) throw new Error('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY.');

  const firebaseResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestUri: window.location.origin,
        postBody: `id_token=${encodeURIComponent(credential)}&providerId=google.com`,
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    },
  );
  const firebaseData = (await firebaseResponse.json().catch(() => null)) as
    | (FirebaseIdentityResponse & { error?: { message?: string } })
    | null;
  if (!firebaseResponse.ok || !firebaseData?.idToken) {
    const reason = firebaseData?.error?.message;
    throw new Error(
      reason === 'OPERATION_NOT_ALLOWED'
        ? 'Enable Google as a sign-in provider in Firebase Authentication.'
        : reason === 'API_KEY_INVALID'
          ? 'Firebase rejected the web API key. Check the Firebase web app configuration.'
          : reason ?? `Firebase sign-in failed (${firebaseResponse.status})`,
    );
  }

  const session = await apiRequest<FirebaseSessionResponse>('/auth/firebase', {
    method: 'POST',
    body: { id_token: firebaseData.idToken },
    auth: false,
  });
  return {
    ...session,
    google: {
      sub: session.firebase_uid || firebaseData.localId,
      email: firebaseData.email ?? session.user.email,
      name: firebaseData.displayName ?? session.user.display_name,
      picture: firebaseData.photoUrl ?? null,
    },
  };
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
  /** Google ID token → Firebase ID token → verified backend session. */
  signInWithGoogle: (credential: string) =>
    FIREBASE_API_KEY ? exchangeGoogleCredentialForFirebase(credential) : exchangeGoogleCredential(credential),

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
