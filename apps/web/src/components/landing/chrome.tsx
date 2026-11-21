'use client';

/** Landing header + footer. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArrowRight, GitBranch, Menu, Sparkles, X } from 'lucide-react';

import { ButtonLink } from '@/components/ui';
import { BrandLockup } from '@/components/brand/brand';
import { healthApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/platform', label: 'Platform' },
  { href: '/capabilities', label: 'Capabilities' },
  { href: '/simulations', label: 'Simulation Lab', badge: 'LIVE' },
  { href: '/use-cases', label: 'Use Cases' },
  { href: '/technology', label: 'Architecture' },
];

export function LandingHeader() {
  const pathname = usePathname();
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
      'sticky top-0 z-40 border-b transition-all duration-300',
      scrolled ? 'border-line-strong bg-void/85 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl' : 'border-line/70 bg-void/50 backdrop-blur-xl',
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-7">
        <Link href="/" className="rounded-sm flex items-center gap-2 group" aria-label="SAATRAAI home">
          <BrandLockup symbolClassName="h-8 w-8 transition-transform group-hover:scale-105" wordmarkClassName="text-[13px]" />
        </Link>

        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Sections">
          {NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-3.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all duration-200 flex items-center gap-1.5',
                  isActive
                    ? 'text-primary bg-primary/10 border border-primary/30 shadow-[0_0_12px_rgba(114,227,180,0.15)]'
                    : 'text-ink-dim hover:text-ink hover:bg-surface/60',
                )}
              >
                {item.label}
                {item.badge && (
                  <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded tracking-wider font-semibold bg-primary/20 text-primary border border-primary/40 animate-pulse-soft">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint sm:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiState === 'online' ? 'bg-success shadow-[0_0_8px_#72e3b4]' : apiState === 'offline' ? 'bg-danger' : 'bg-ink-faint animate-pulse-soft'
              }`}
            />
            API {apiState === 'checking' ? 'CHECKING' : apiState.toUpperCase()}
          </span>
          <ButtonLink href="/sign-in" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/investigations/new" variant="primary" size="sm" className="hidden sm:inline-flex" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            Launch Mission
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
      <nav id="landing-mobile-navigation" className={cn('border-t border-line px-5 py-3 md:hidden bg-surface/95 backdrop-blur-2xl', mobileOpen ? 'block' : 'hidden')} aria-label="Mobile sections">
        <div className="mx-auto grid max-w-7xl gap-1">
          {NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-[13px] transition-colors flex items-center justify-between',
                  isActive ? 'text-primary bg-primary/10 font-medium' : 'text-ink-dim hover:bg-elevated hover:text-ink',
                )}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <ButtonLink href="/investigations/new" variant="primary" size="md" className="mt-2 sm:hidden" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            Launch Mission
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface/80 backdrop-blur-xl">
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
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Architecture & Lab</div>
          <ul className="mt-3 space-y-2 text-[12.5px] text-ink-dim">
            <li><Link className="hover:text-primary transition-colors" href="/platform">Investigation pipeline</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="/capabilities">Sensor modalities</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="/simulations">Simulation Lab (Live)</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="/technology">Tech Architecture</Link></li>
          </ul>
        </div>

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Mission Solutions</div>
          <ul className="mt-3 space-y-2 text-[12.5px] text-ink-dim">
            <li><Link className="hover:text-primary transition-colors" href="/use-cases">Disaster & flood attribution</Link></li>
            <li><Link className="hover:text-primary transition-colors" href="/use-cases">Urban & environmental audits</Link></li>
            <li>
              <a className="inline-flex items-center gap-1.5 hover:text-ink transition-colors" href="https://github.com/aadidevj007/Saatraai" target="_blank" rel="noreferrer">
                <GitBranch className="h-3.5 w-3.5" /> Repository
              </a>
            </li>
            <li className="font-mono text-[11px] text-primary/80">v0.1.0 · Autonomous Earth Intelligence</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60 px-6 py-4">
        <p className="mx-auto max-w-6xl text-[11px] text-ink-faint">
          Scientific integrity note: SAATRAAI reports what the available evidence supports or weakens — it never
          presents correlation as proof. Unconfigured providers and unavailable models are labelled explicitly
          throughout the interface. Simulated data is strictly isolated and marked.
        </p>
      </div>
    </footer>
  );
}
