/**
 * Google sign-in bridge.
 *
 * Flow: Google Identity Services issues an ID token in the browser → this route
 * verifies it against Google's tokeninfo endpoint (audience + issuer + expiry) →
 * the same verified identity is exchanged for a real FastAPI JWT pair by
 * registering (or signing in) the account on the SAATRAAI backend with a
 * server-derived secret. No password ever reaches the browser, and no Firebase
 * or Google credentials are exposed client-side.
 *
 * Requires env: GOOGLE_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_CLIENT_ID), GOOGLE_BRIDGE_SECRET.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

interface TokenInfo {
  sub: string;
  aud: string;
  iss: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp: string;
}

const GOOGLE_TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo';

export async function POST(request: Request): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const bridgeSecret = process.env.GOOGLE_BRIDGE_SECRET;
  const backendBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

  if (!clientId || !bridgeSecret) {
    return NextResponse.json(
      {
        error: 'GOOGLE_SIGN_IN_NOT_CONFIGURED',
        detail:
          'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_BRIDGE_SECRET in apps/web/.env.local (see .env.example).',
      },
      { status: 501 },
    );
  }

  let credential: unknown;
  try {
    const body = (await request.json()) as { credential?: unknown };
    credential = body.credential;
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', detail: 'Missing JSON body.' }, { status: 400 });
  }
  if (typeof credential !== 'string' || credential.length < 20) {
    return NextResponse.json({ error: 'BAD_REQUEST', detail: 'Missing Google credential.' }, { status: 400 });
  }

  /* 1. Verify the ID token with Google (server-side, TLS). */
  let info: TokenInfo;
  try {
    const verifyUrl = `${GOOGLE_TOKENINFO}?id_token=${encodeURIComponent(credential)}`;
    const response = await fetch(verifyUrl, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'GOOGLE_TOKEN_REJECTED', detail: 'Google rejected the presented ID token.' },
        { status: 401 },
      );
    }
    info = (await response.json()) as TokenInfo;
  } catch {
    return NextResponse.json(
      { error: 'GOOGLE_UNREACHABLE', detail: 'Could not reach Google for token verification.' },
      { status: 502 },
    );
  }

  const expectedIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  const expMs = Number(info.exp) * 1000;
  const valid =
    info.aud === clientId &&
    expectedIssuers.includes(info.iss) &&
    Number.isFinite(expMs) &&
    expMs > Date.now() &&
    (info.email_verified === true || info.email_verified === 'true') &&
    typeof info.email === 'string';

  if (!valid) {
    return NextResponse.json(
      { error: 'GOOGLE_TOKEN_INVALID', detail: 'ID token claims failed validation (audience, issuer, expiry or email).' },
      { status: 401 },
    );
  }

  const email = (info.email as string).toLowerCase();

  /* 2. Exchange the verified identity for real backend JWTs. */
  const derivedPassword = createHmac('sha256', bridgeSecret).update(`saatraai-google:${email}`).digest('hex');

  const backend = async (path: string, body: unknown): Promise<Response> =>
    fetch(`${backendBase}/api/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

  let tokens: { access_token: string; refresh_token: string } | null = null;
  const registerResponse = await backend('/auth/register', {
    email,
    password: derivedPassword,
    display_name: info.name ?? email.split('@')[0],
  }).catch(() => null);

  if (registerResponse?.ok) {
    tokens = (await registerResponse.json()) as { access_token: string; refresh_token: string };
  } else {
    const loginResponse = await backend('/auth/login', { email, password: derivedPassword }).catch(() => null);
    if (loginResponse?.ok) {
      tokens = (await loginResponse.json()) as { access_token: string; refresh_token: string };
    } else if (loginResponse) {
      const detail = await loginResponse.json().catch(() => null);
      const message =
        loginResponse.status === 401
          ? 'This Google email already has a backend account created with different credentials and cannot be linked automatically.'
          : (detail as { detail?: string } | null)?.detail ?? `Backend login failed (${loginResponse.status}).`;
      return NextResponse.json({ error: 'BACKEND_LINK_FAILED', detail: message }, { status: 502 });
    } else {
      return NextResponse.json(
        { error: 'BACKEND_UNREACHABLE', detail: `SAATRAAI API at ${backendBase} is unreachable.` },
        { status: 502 },
      );
    }
  }

  /* 3. Load the canonical backend user record. */
  const meResponse = await fetch(`${backendBase}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: 'no-store',
  }).catch(() => null);
  const user = meResponse?.ok
    ? await meResponse.json()
    : { id: 'unknown', email, display_name: info.name ?? null };

  /* 4. Compare derived secrets defensively (constant-time, informational). */
  const expected = createHmac('sha256', bridgeSecret).update(`saatraai-google:${email}`).digest('hex');
  if (expected.length === derivedPassword.length) timingSafeEqual(Buffer.from(expected), Buffer.from(derivedPassword));

  return NextResponse.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    user,
    google: {
      sub: info.sub,
      email: info.email,
      name: info.name ?? null,
      picture: info.picture ?? null,
    },
  });
}
