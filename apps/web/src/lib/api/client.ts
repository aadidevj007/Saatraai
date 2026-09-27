/**
 * Centralized API client — every network call goes through here.
 * No scattered fetch() anywhere else in the app.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
export const API_PREFIX = `${API_BASE_URL}/api/v1`;

const SESSION_KEY = 'saatraai.session';
export const SESSION_EXPIRED_EVENT = 'saatraai:session-expired';

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export type ApiErrorKind = 'http' | 'network' | 'parse';

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly details: unknown;

  constructor(message: string, status: number, kind: ApiErrorKind = 'http', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.details = details;
  }

  get isOffline(): boolean {
    return this.kind === 'network';
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/* ── Session token storage (shared with AuthProvider) ── */

export function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}

function authHeaders(): Record<string, string> {
  const session = readSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

/* ── Core request ── */

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
  /** Return null instead of throwing on 404/405 (for optional extended endpoints). */
  nullOn404?: boolean;
}

async function parseError(response: Response): Promise<ApiError> {
  let detail: unknown = null;
  try {
    const data = await response.json();
    detail = (data as { detail?: unknown }).detail ?? data;
  } catch {
    detail = null;
  }
  const message =
    typeof detail === 'string'
      ? detail
      : detail && typeof detail === 'object' && 'message' in detail
        ? String((detail as { message: unknown }).message)
        : `API returned ${response.status}`;
  return new ApiError(message, response.status, 'http', detail);
}

async function rawRequest<T>(path: string, options: RequestOptions, token?: string): Promise<T> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false) {
    const bearer = token ?? authHeaders().Authorization;
    if (bearer) headers.Authorization = bearer;
  }

  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
      signal: options.signal,
      cache: 'no-store',
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(
      'Unable to reach the SAATRAAI API. Is the backend running?',
      0,
      'network',
      error,
    );
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ApiError('API returned an unreadable response', response.status, 'parse', error);
  }
}

async function tryRefresh(): Promise<StoredSession | null> {
  const session = readSession();
  if (!session) return null;
  try {
    const refreshed = await rawRequest<{ access_token: string; refresh_token: string }>(
      '/auth/refresh',
      { method: 'POST', body: { refresh_token: session.refresh_token }, auth: false },
    );
    const next: StoredSession = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: Date.now() + 14 * 60 * 1000,
    };
    writeSession(next);
    return next;
  } catch {
    clearSession();
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    return null;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const canRetry =
      error instanceof ApiError &&
      error.status === 401 &&
      options.auth !== false &&
      !path.startsWith('/auth/');
    if (!canRetry) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405) && options.nullOn404) {
        return null as T;
      }
      throw error;
    }
    const session = await tryRefresh();
    if (!session) {
      if (options.nullOn404) return null as T;
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
    try {
      return await rawRequest<T>(path, options, `Bearer ${session.access_token}`);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405) && options.nullOn404) {
        return null as T;
      }
      throw error;
    }
  }
}

/** Probe reachability without auth — used for system status. */
export async function probeApi(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${API_BASE_URL}/health`, { signal: controller.signal, cache: 'no-store' });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function apiBase(): string {
  return API_BASE_URL;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}
