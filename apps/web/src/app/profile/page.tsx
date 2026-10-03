'use client';

/** First-time profile confirmation after Google sign-in — no password, identity comes from Google. */

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, GraduationCap, Lightbulb } from 'lucide-react';

import { Avatar } from '@/components/auth/google-sign-in';
import { Button, Field, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { formatDateTime } from '@/lib/utils';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { status, user, google, needsProfile, completeProfile, preferences } = useAuth();

  const [interest, setInterest] = useState(preferences?.research_interest ?? '');
  const [organization, setOrganization] = useState(preferences?.organization ?? '');
  const [role, setRole] = useState(preferences?.role ?? '');

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/sign-in');
    if (status === 'authenticated' && !needsProfile) router.replace('/overview');
  }, [status, needsProfile, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const name = google?.name ?? user?.display_name ?? user?.email ?? 'Researcher';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    completeProfile({
      research_interest: interest.trim() || undefined,
      organization: organization.trim() || undefined,
      role: role.trim() || undefined,
    });
    router.replace('/overview');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-6 py-12">
      <div className="aurora" aria-hidden />
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center text-center">
          <Avatar src={google?.picture} name={name} size={72} />
          <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-primary">Welcome to SAATRAAI</p>
          <h1 className="mt-2 text-[22px] font-semibold text-ink">{name}</h1>
          <p className="mt-1 text-[13px] text-ink-dim">{user?.email}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded border border-line bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Google account
            </span>
            <span className="rounded border border-line bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Session issued {formatDateTime(new Date().toISOString())}
            </span>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <p className="text-[12.5px] leading-relaxed text-ink-dim">
            Your identity is provided by Google — there is no password to create. Optionally tell us about your
            research context so investigations can be framed for your domain.
          </p>

          <Field label="Research interest" htmlFor="interest">
            <div className="relative">
              <Lightbulb className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <Input
                id="interest"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="Flood dynamics, urban expansion, crop stress…"
                className="pl-9"
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Organization" htmlFor="org">
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <Input
                  id="org"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Institution or team"
                  className="pl-9"
                />
              </div>
            </Field>
            <Field label="Role" htmlFor="role">
              <div className="relative">
                <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Researcher, Analyst…"
                  className="pl-9"
                />
              </div>
            </Field>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" icon={<ArrowRight className="h-4 w-4" />}>
            Enter SAATRAAI
          </Button>

          <p className="text-center text-[11.5px] text-ink-faint">
            Profile details are stored on this device only; identity and session live on the SAATRAAI API.
          </p>
        </form>
      </div>
    </main>
  );
}
