'use client';

/**
 * SAATRAAI Next-Gen Command Landing Page
 *
 * Streamlined orbital command center featuring:
 *   • Fixed 3D Earth Globe backdrop with interactive geocentric orbit
 *   • Live atmospheric weather telemetry via Open-Meteo
 *   • Country Atlas geospatial explorer
 *   • Next-gen cybernetic mission hubs routing to dedicated pages:
 *     (/platform, /capabilities, /simulations, /use-cases, /technology)
 *   • Live system telemetry bar and Quick Simulation launcher
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Cpu,
  Layers,
  Play,
  Radar,
  ShieldCheck,
  Sparkles,
  Telescope,
  Terminal,
  Waves,
} from 'lucide-react';

import { LandingFooter, LandingHeader } from '@/components/landing/chrome';
import { LandingEarthBackdrop, LandingHero } from '@/components/landing/hero';
import { CountryAtlasSection, type WeatherState } from '@/components/landing/country-atlas';
import { ButtonLink } from '@/components/ui';

export default function LandingPage() {
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'India',
    latitude: 20.5937,
    longitude: 78.9629,
  });

  const [weatherState, setWeatherState] = useState<WeatherState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({
        latitude: selectedCountry.latitude.toFixed(3),
        longitude: selectedCountry.longitude.toFixed(3),
        current: 'temperature_2m,rain,precipitation',
        timezone: 'auto',
        forecast_days: '1',
      }).toString();

      try {
        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
        if (!res.ok) throw new Error('Failed to load weather');
        const data = await res.json();
        if (!data.current || typeof data.current.temperature_2m !== 'number') {
          throw new Error('Incomplete weather payload');
        }
        if (active) {
          setWeatherState({
            status: 'ready',
            data: {
              temperature: data.current.temperature_2m,
              rain: data.current.rain ?? 0,
              time: data.current.time ?? '',
              timezone: data.timezone ?? 'UTC',
            },
          });
        }
      } catch {
        if (active) {
          setWeatherState({ status: 'error' });
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [selectedCountry]);

  const handleSelectCountry = useCallback((c: { name: string; latitude: number; longitude: number }) => {
    setSelectedCountry(c);
  }, []);

  return (
    <div className="saatraai-landing relative isolate min-h-screen bg-void text-ink">
      {/* 3D Earth Globe Canvas fixed in background */}
      <LandingEarthBackdrop onCountrySelect={handleSelectCountry} />

      {/* Main interactive interface and feature layers */}
      <div className="relative z-10">
        <LandingHeader />

        {/* Hero with real-time conditions & Blue Marble orbit */}
        <LandingHero
          selectedCountryName={selectedCountry.name}
          weatherState={weatherState}
        />

        {/* Live System Telemetry HUD Bar */}
        <div className="border-y border-line bg-surface/75 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 font-mono text-[11px] text-ink-dim">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span>SPATIAL ENGINE: <strong className="text-ink">POSTGIS 16</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Radar className="h-3.5 w-3.5 text-primary" />
              <span>SENSOR SUITE: <strong className="text-ink">SAR · OPTICAL · DEM · THERMAL</strong></span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
              <span>VERIFICATION: <strong className="text-ink">AUDITABLE FALSIFICATION</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span>PROVENANCE: <strong className="text-primary">CRYPTOGRAPHIC HASH</strong></span>
            </div>
          </div>
        </div>

        {/* Next-Gen Mission Control Hub (Portal to Split Deep-Dive Pages) */}
        <section className="border-b border-line bg-void/85 py-16 backdrop-blur-2xl lg:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-primary">
                Autonomous Earth Intelligence
              </p>
              <h2 className="display-font mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
                Explore the System Architecture
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-dim">
                Each subsystem of SAATRAAI is dedicated to auditable, evidence-backed inquiry.
                Select a division below to inspect the pipeline, explore multi-sensor modalities, or test real-time simulations.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Platform & Pipeline */}
              <Link
                href="/platform"
                className="group relative rounded-xl border border-line bg-surface/60 p-6 transition-all duration-300 hover:border-primary/50 hover:bg-surface hover:shadow-[0_0_30px_rgba(114,227,180,0.15)] flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 transition-transform group-hover:scale-110">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary">Stage Architecture</span>
                  <h3 className="mt-1 text-lg font-semibold text-ink group-hover:text-primary transition-colors">
                    Investigation Pipeline
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                    Fourteen auditable stages turning natural language questions into signed execution traces and evidence chains.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span>Inspect Pipeline</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 2: Capabilities & Modalities */}
              <Link
                href="/capabilities"
                className="group relative rounded-xl border border-line bg-surface/60 p-6 transition-all duration-300 hover:border-secondary/50 hover:bg-surface hover:shadow-[0_0_30px_rgba(134,186,255,0.15)] flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mb-4 transition-transform group-hover:scale-110">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-secondary">Remote Sensing</span>
                  <h3 className="mt-1 text-lg font-semibold text-ink group-hover:text-secondary transition-colors">
                    Sensors & Reasoning
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                    Sentinel-1 SAR C-band, Sentinel-2 10m optical, DEM elevation vectors, and causal hypothesis falsification.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-secondary">
                  <span>Explore Modalities</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 3: Simulation Lab */}
              <Link
                href="/simulations"
                className="group relative rounded-xl border border-primary/40 bg-primary/5 p-6 transition-all duration-300 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_35px_rgba(114,227,180,0.22)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                      <Play className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-[8.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 animate-pulse-soft">
                      LIVE LAB
                    </span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-primary">Interactive Benchmarks</span>
                  <h3 className="mt-1 text-lg font-semibold text-ink group-hover:text-primary transition-colors">
                    Scenario Simulation Lab
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                    Trigger live synthetic disaster runs (Brahmaputra floods, California wildfires, Antarctic ice rifts) in real time.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span>Run Live Simulation</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 4: Use Cases & Missions */}
              <Link
                href="/use-cases"
                className="group relative rounded-xl border border-line bg-surface/60 p-6 transition-all duration-300 hover:border-emerald-500/50 hover:bg-surface hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 transition-transform group-hover:scale-110">
                    <Waves className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-400">Mission Domains</span>
                  <h3 className="mt-1 text-lg font-semibold text-ink group-hover:text-emerald-400 transition-colors">
                    Mission Solutions
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                    Disaster relief, flood attribution, infrastructure audits, and climate monitoring engineered for critical operations.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <span>View Solutions</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Country Atlas: interactive exploration matching demo */}
        <CountryAtlasSection
          selectedCountryName={selectedCountry.name}
          weatherState={weatherState}
          onSelectCountry={handleSelectCountry}
        />

        {/* Quick Simulation Teaser Callout */}
        <section className="border-t border-line bg-surface/40 py-16 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl px-6">
            <div className="hud-border rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

              <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-primary">
                Test Without Credentials
              </span>
              <h2 className="display-font mt-3 text-2xl sm:text-4xl font-bold text-ink">
                Ready to Experience Next-Gen Autonomous Analysis?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-dim sm:text-base">
                Launch a live simulation run directly in your browser. Watch multi-satellite sensor sweeps,
                hypothesis falsification, and mathematical confidence convergence in real time.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <ButtonLink href="/simulations" variant="primary" size="lg" className="glow-emerald" icon={<Play className="h-4 w-4" />}>
                  Launch Interactive Simulation Lab
                </ButtonLink>
                <ButtonLink href="/investigations/new" variant="outline" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                  Start Live Investigation
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
}
