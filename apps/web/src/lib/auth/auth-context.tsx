'use client';

/**
 * Central auth state: Google sign-in → backend JWT session → app profile.
 * Handles loading / authenticated / unauthenticated / token expiry / logout.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  authApi,
  markProfileCompleted,
  profileCompleted,
  readPreferences,
  resetProfileFlags,
  writePreferences,
} from '@/lib/api/auth';
import {
  SESSION_EXPIRED_EVENT,
  clearSession,
  readSession,
  writeSession,
  type StoredSession,
} from '@/lib/api/client';
import type { GoogleProfile, User, UserPreferences } from '@/lib/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  google: GoogleProfile | null;
  preferences: UserPreferences | null;
  needsProfile: boolean;
  googleConfigured: boolean;
  error: string | null;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: (options?: { notify?: boolean }) => void;
  completeProfile: (prefs: UserPreferences) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [google, setGoogle] = useState<GoogleProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    clearSession();
    setUser(null);
    setGoogle(null);
    setStatus('unauthenticated');
  }, []);

  /* Restore an existing session on mount. */
  useEffect(() => {
    let cancelled = false;
    const session: StoredSession | null = readSession();
    if (!session) {
      const t = window.setTimeout(() => setStatus('unauthenticated'), 0);
      return () => window.clearTimeout(t);
    }
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        if (!me) {
          clear();
          return;
        }
        setUser(me);
        setPreferences(readPreferences());
        setNeedsProfile(!profileCompleted());
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) clear();
      });
    return () => {
      cancelled = true;
    };
  }, [clear]);

  /* Token expiry broadcast from the API client. */
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setGoogle(null);
      setStatus('unauthenticated');
      setError('Your session expired. Please sign in with Google again.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const signInWithGoogle = useCallback(async (credential: string) => {
    setError(null);
    const response = await authApi.signInWithGoogle(credential);
    const session: StoredSession = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_at: Date.now() + 14 * 60 * 1000,
    };
    writeSession(session);
    const isNew = !profileCompleted();
    setUser(response.user);
    setGoogle(response.google);
    setPreferences(readPreferences());
    setNeedsProfile(isNew);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(() => {
    resetProfileFlags();
    setPreferences(null);
    setNeedsProfile(false);
    setError(null);
    clear();
  }, [clear]);

  const completeProfile = useCallback((prefs: UserPreferences) => {
    writePreferences(prefs);
    markProfileCompleted();
    setPreferences(prefs);
    setNeedsProfile(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      google,
      preferences,
      needsProfile,
      googleConfigured: Boolean(GOOGLE_CLIENT_ID),
      error,
      signInWithGoogle,
      signOut,
      completeProfile,
    }),
    [status, user, google, preferences, needsProfile, error, signInWithGoogle, signOut, completeProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
