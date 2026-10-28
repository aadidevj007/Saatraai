'use client';

/** Landing header + footer. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, GitBranch, Menu, X } from 'lucide-react';

import { ButtonLink } from '@/components/ui';
import { BrandLockup } from '@/components/brand/brand';
import { healthApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '#pipeline', label: 'Platform' },
  { href: '#modalities', label: 'Capabilities' },
  { href: '#reasoning', label: 'Research' },
  { href: '#use-cases', label: 'Use cases' },
  { href: '#technology', label: 'About' },
];

export function LandingHeader() {
  const [apiState, setApiState] = useState<'checking' | 'online' | 'offline'>('checking');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  return (
    <header className={cn(
      'sticky top-0 z-40 border-b transition-colors duration-300',
      scrolled ? 'border-line bg-surface/95 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl' : 'border-white/[0.06] bg-void/45 backdrop-blur-md',
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-7">
        <Link href="/" className="rounded-sm" aria-label="SAATRAAI home">
          <BrandLockup symbolClassName="h-8 w-8" wordmarkClassName="text-[13px]" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
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
          <ButtonLink href="/sign-in" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/sign-in" variant="primary" size="sm" className="hidden sm:inline-flex" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            Get started
          </ButtonLink>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-dim transition-colors hover:border-line-strong hover:text-ink md:hidden"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <nav id="landing-mobile-navigation" className={cn('border-t border-line px-5 py-3 md:hidden', mobileOpen ? 'block' : 'hidden')} aria-label="Mobile sections">
        <div className="mx-auto grid max-w-7xl gap-1">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-[13px] text-ink-dim transition-colors hover:bg-elevated hover:text-ink">
              {item.label}
            </a>
          ))}
          <ButtonLink href="/sign-in" variant="primary" size="md" className="mt-2 sm:hidden" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            Get started
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <BrandLockup symbolClassName="h-8 w-8" wordmarkClassName="text-[13px]" />
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
