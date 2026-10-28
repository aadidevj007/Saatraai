'use client';

/** Google-only sign-in screen. */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { BrandLockup } from '@/components/brand/brand';
import { EarthVisual } from '@/components/auth/earth-visual';
import { GoogleSignIn } from '@/components/auth/google-sign-in';
import { Kbd } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { API_BASE_CONFIGURED, probeApi } from '@/lib/api/client';

export default function SignInPage() {
  const router = useRouter();
  const { status, needsProfile, google } = useAuth();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void probeApi().then((online) => { if (active) setApiOnline(online); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(needsProfile ? '/profile' : '/dashboard');
    }
  }, [status, needsProfile, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-void">
      <div className="aurora" aria-hidden />
      {/* top status rail */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2 text-ink-dim transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-[12px]">Back to overview</span>
        </Link>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          <span className="hidden sm:inline">AUTH · OAUTH 2.0 / OIDC</span>
            <span className="flex items-center gap-1.5" role="status">
            <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? 'bg-success' : 'bg-warning'}`} />
            {!API_BASE_CONFIGURED ? 'API URL NOT CONFIGURED' : apiOnline ? 'API ONLINE' : apiOnline === false ? 'API UNAVAILABLE' : 'CHECKING API'}
          </span>
        </div>
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: identity */}
        <section className="flex flex-col items-center lg:items-start">
          <div className="mb-6 flex flex-col items-center gap-1 lg:items-start">
            <BrandLockup symbolClassName="h-10 w-10" wordmarkClassName="text-[15px] tracking-[0.26em]" />
            <div className="pl-1 font-mono text-[9.5px] uppercase tracking-[0.3em] text-ink-faint">
              Earth Intelligence Platform
            </div>
          </div>

          <EarthVisual className="mb-6 w-[300px] sm:w-[380px] lg:w-[440px]" />

          <div className="text-center lg:text-left">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
              Observe · Investigate · Verify · Explain
            </p>
            <h1 className="mt-3 text-[26px] font-semibold leading-tight text-ink sm:text-[32px]">
              Investigate Earth with Evidence
            </h1>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-dim">
              Turn natural-language questions into evidence-driven Earth observation investigations — with explicit
              contradictions, missing-evidence detection and auditable provenance.
            </p>
          </div>
        </section>

        {/* Right: sign-in card */}
        <section className="glass-surface glow-edge rounded-xl p-7 sm:p-9">
          <header className="mb-7">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-faint">Secure access</p>
            <h2 className="mt-2 text-[19px] font-semibold text-ink">Sign in to SAATRAAI</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
              Sign in with the configured Google identity provider. The verified identity is exchanged for a scoped API session.
            </p>
          </header>

          <GoogleSignIn
            onSuccess={() => router.replace(needsProfile || !google ? '/profile' : '/dashboard')}
          />

          <div className="mt-8 space-y-3 border-t border-line pt-6">
            <FlowStep step="01" label="Google OAuth consent" detail="Verify identity with Google" />
            <FlowStep step="02" label="Server verification" detail="ID token checked by the SAATRAAI API route" />
            <FlowStep step="03" label="API session" detail="Real FastAPI JWT pair issued for your account" />
          </div>

          <p className="mt-6 text-[11.5px] leading-relaxed text-ink-faint">
            No email/password, phone or social alternatives exist in this application by design. Press{' '}
            <Kbd>Esc</Kbd> anywhere after signing in to open the command palette.
          </p>
        </section>
      </div>
    </main>
  );
}

function FlowStep({ step, label, detail }: { step: string; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 font-mono text-[10px] tracking-widest text-primary/70">{step}</span>
      <div>
        <div className="text-[12.5px] font-medium text-ink">{label}</div>
        <div className="text-[11.5px] text-ink-faint">{detail}</div>
      </div>
    </div>
  );
}
