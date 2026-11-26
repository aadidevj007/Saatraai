'use client';

/**
 * SAATRAAI minimal home page — 3D animated Earth, live country weather,
 * and quick links to explore the platform.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Cpu, Layers, ShieldCheck } from 'lucide-react';
import { LandingFooter, LandingHeader } from '@/components/landing/chrome';
import { LandingEarthBackdrop, LandingHero } from '@/components/landing/hero';
import { CountryAtlasSection, type WeatherState } from '@/components/landing/country-atlas';
import { PageTransition, Reveal, TiltCard } from '@/components/ui';

const QUICK_LINKS = [
  {
    href: '/platform',
    icon: ShieldCheck,
    title: 'Platform',
    description: 'See how questions turn into verified evidence.',
  },
  {
    href: '/capabilities',
    icon: Layers,
    title: 'Capabilities',
    description: 'Satellite sensors, timelines, and contradiction checks.',
  },
  {
    href: '/use-cases',
    icon: Compass,
    title: 'Use cases',
    description: 'Floods, urban growth, vegetation, and disaster response.',
  },
  {
    href: '/technology',
    icon: Cpu,
    title: 'Technology',
    description: 'PostGIS, FastAPI, and model adapters under the hood.',
  },
];

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
    <div className="saatraai-landing relative isolate min-h-screen bg-void">
      <LandingEarthBackdrop
        selectedCountry={selectedCountry}
        onCountrySelect={handleSelectCountry}
      />

      <div className="relative z-10">
        <LandingHeader />

        <PageTransition>
          <LandingHero
            selectedCountryName={selectedCountry.name}
            weatherState={weatherState}
          />

          <CountryAtlasSection
            selectedCountryName={selectedCountry.name}
            weatherState={weatherState}
            onSelectCountry={handleSelectCountry}
          />

          <section className="section-band border-b border-line px-6 py-12 sm:px-12">
            <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_LINKS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Reveal key={item.href} delay={i * 0.06}>
                    <TiltCard maxTilt={8} className="h-full rounded-xl">
                      <Link
                        href={item.href}
                        className="glass-option group flex h-full flex-col justify-between rounded-xl p-5"
                      >
                        <div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="mt-3.5 text-[14.5px] font-medium text-ink group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">
                            {item.description}
                          </p>
                        </div>
                        <span className="mt-4 inline-flex items-center gap-1 text-[12px] text-primary">
                          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    </TiltCard>
                  </Reveal>
                );
              })}
            </div>
          </section>
        </PageTransition>

        <LandingFooter />
      </div>
    </div>
  );
}
