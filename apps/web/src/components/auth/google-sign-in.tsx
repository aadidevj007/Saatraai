'use client';

/**
 * Official Google sign-in button (Google Identity Services).
 * When NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing the component renders an honest
 * NOT CONFIGURED state instead of a fake login form.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';

import { NotConfiguredState } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useToast } from '@/lib/state/toast';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Read display claims from a Google ID token (verified server-side; decoded here for UI only). */
export function googleDisplayClaims(token: string): { name: string | null; picture: string | null; email: string | null } {
  const payload = decodeJwtPayload(token);
  if (!payload) return { name: null, picture: null, email: null };
  return {
    name: typeof payload.name === 'string' ? payload.name : null,
    picture: typeof payload.picture === 'string' ? payload.picture : null,
    email: typeof payload.email === 'string' ? payload.email : null,
  };
}

export function GoogleSignIn({
  onSuccess,
  labelText = 'Continue with Google',
}: {
  onSuccess: () => void;
  labelText?: string;
}) {
  const { signInWithGoogle, googleConfigured, error } = useAuth();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const initializedRef = useRef(false);
  const isDev = process.env.NODE_ENV !== 'production';

  const handleCredential = useCallback(
    async (credential: string) => {
      setPending(true);
      try {
        await signInWithGoogle(credential);
        onSuccess();
      } catch (err) {
        toast({
          variant: 'error',
          title: 'Google sign-in failed',
          description: err instanceof Error ? err.message : 'Unknown error',
          durationMs: 8000,
        });
      } finally {
        setPending(false);
      }
    },
    [signInWithGoogle, onSuccess, toast],
  );

  /* Load the GIS script once, then poll until the global API appears. */
  useEffect(() => {
    if (!googleConfigured) return;
    if (!document.getElementById('gsi-client')) {
      const script = document.createElement('script');
      script.id = 'gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setScriptFailed(true);
        toast({
          variant: 'error',
          title: 'Google sign-in blocked or unreachable',
          description: 'Allow accounts.google.com in browser shields or network settings.',
        });
      };
      document.head.appendChild(script);
    }

    const interval = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        setScriptReady(true);
        setScriptFailed(false);
        window.clearInterval(interval);
      }
    }, 120);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      if (!window.google?.accounts?.id) setScriptFailed(true);
    }, 15_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [googleConfigured, toast]);

  /* Initialize + render the official button. */
  useEffect(() => {
    if (!googleConfigured || !scriptReady || !buttonRef.current || initializedRef.current) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;

    initializedRef.current = true;
    window.google.accounts.id.initialize({
      client_id: clientId,
      cancel_on_tap_outside: false,
      callback: (response) => void handleCredential(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: 300,
      locale: 'en',
      shape: 'rectangular',
      logo_alignment: 'left',
    });
  }, [scriptReady, googleConfigured, handleCredential]);

  const handleQuickSignIn = useCallback(() => {
    void handleCredential('dev-google-token:researcher@saatraai.local:Dr.%20Elena%20Rostova%20(Lead%20EO%20Scientist)');
  }, [handleCredential]);

  if (!googleConfigured) {
    return (
      <NotConfiguredState
        title="Google sign-in isn’t set up yet"
        description="Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your environment and restart the server."
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative min-h-[44px] w-full max-w-[300px]">
        <div ref={buttonRef} className="flex justify-center" data-testid="google-button" />
        {(!scriptReady || pending) && !scriptFailed && (
          <div className="glass-option-active absolute inset-0 flex items-center justify-center rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="ml-2 text-[12px] text-ink-dim">
              {pending ? 'Signing you in…' : 'Loading Google sign-in…'}
            </span>
          </div>
        )}
        {scriptFailed && !scriptReady && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-center text-[12px] text-warning">
            Google sign-in couldn’t load. Check browser shields for accounts.google.com.
          </div>
        )}
      </div>

      {isDev && (
        <>
          <div className="flex w-full max-w-[300px] items-center gap-2 text-[11px] text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[10px] uppercase tracking-wider">or local dev</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={handleQuickSignIn}
            className="glass-option-active flex w-full max-w-[300px] items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-medium text-white active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Quick Dev Sign-In</span>
          </button>
        </>
      )}

      <p className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
        <ShieldCheck className="h-3.5 w-3.5 text-success/70" />
        Verified by Google
      </p>

      {labelText && <span className="sr-only">{labelText}</span>}
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}

/** Small avatar rendering a Google picture or initials fallback. */
export function Avatar({
  src,
  name,
  size = 28,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border border-line-strong object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full border border-primary/40 bg-primary/15 font-medium text-primary"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name}
    >
      {initials || '?'}
    </span>
  );
}
