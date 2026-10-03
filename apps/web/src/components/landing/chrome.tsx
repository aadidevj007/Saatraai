'use client';

/** Landing header + footer. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, GitBranch, Satellite } from 'lucide-react';

import { Button } from '@/components/ui';
import { healthApi } from '@/lib/api';

const NAV = [
  { href: '#pipeline', label: 'Pipeline' },
  { href: '#modalities', label: 'Modalities' },
  { href: '#reasoning', label: 'Reasoning' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#technology', label: 'Technology' },
];

export function LandingHeader() {
  const [apiState, setApiState] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let alive = true;
    healthApi
      .probe()
      .then(() => alive && setApiState('online'))
      .catch(() => alive && setApiState('offline'));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
            <Satellite className="h-3.5 w-3.5 text-primary" />
          </span>
          <span className="display-font text-[13.5px] font-semibold tracking-[0.2em] text-ink">SAATRAAI</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Sections">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[12.5px] text-ink-dim transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint sm:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiState === 'online' ? 'bg-success' : apiState === 'offline' ? 'bg-danger' : 'bg-ink-faint animate-pulse-soft'
              }`}
            />
            API {apiState === 'checking' ? 'CHECKING' : apiState.toUpperCase()}
          </span>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="primary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
              Start investigation
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
              <Satellite className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="font-mono text-[13.5px] font-semibold tracking-[0.24em] text-ink">SAATRAAI</span>
          </div>
          <p className="mt-3 max-w-sm text-[12.5px] leading-relaxed text-ink-dim">
            Satellite AI for Autonomous Temporal Reasoning and Analysis of Intelligence. Evidence-driven Earth
            observation investigations with explicit falsification, provenance and auditable reasoning.
          </p>
          <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            <Activity className="h-3 w-3 text-success/70" />
            Observe · Investigate · Verify · Explain
          </div>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Platform</div>
          <ul className="mt-3 space-y-2 text-[12.5px] text-ink-dim">
            <li><a className="hover:text-ink" href="#pipeline">Investigation pipeline</a></li>
            <li><a className="hover:text-ink" href="#modalities">Earth observation modalities</a></li>
            <li><a className="hover:text-ink" href="#reasoning">Hypothesis reasoning</a></li>
            <li><a className="hover:text-ink" href="#technology">Technology</a></li>
          </ul>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Access</div>
          <ul className="mt-3 space-y-2 text-[12.5px] text-ink-dim">
            <li>
              <Link className="hover:text-ink" href="/sign-in">Google sign-in</Link>
            </li>
            <li>
              <a className="inline-flex items-center gap-1.5 hover:text-ink" href="https://github.com/aadidevj007/Saatraai" target="_blank" rel="noreferrer">
                <GitBranch className="h-3.5 w-3.5" /> Repository
              </a>
            </li>
            <li className="font-mono text-[11px] text-ink-faint">v0.1.0 · SIH2026</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-6 py-4">
        <p className="mx-auto max-w-6xl text-[11.5px] text-ink-faint">
          Scientific integrity note: SAATRAAI reports what the available evidence supports or weakens — it never
          presents correlation as proof. Unconfigured providers and unavailable models are labelled explicitly
          throughout the interface.
        </p>
      </div>
    </footer>
  );
}
