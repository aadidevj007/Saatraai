'use client';

/**
 * Minimal 3D-driven landing hero & Earth backdrop.
 */

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, Globe2 } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { WeatherCard, type WeatherState } from '@/components/landing/country-atlas';

const EarthGlobe = dynamic(
  () => import('@/components/three/earth-globe').then((m) => m.EarthGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-40 w-40 animate-pulse-soft rounded-full border border-primary/20 bg-primary/5" />
      </div>
    ),
  },
);

export function LandingEarthBackdrop({
  selectedCountry,
  onCountrySelect,
}: {
  selectedCountry?: { name: string; latitude: number; longitude: number };
  onCountrySelect?: (c: { name: string; latitude: number; longitude: number }) => void;
}) {
  const markers = selectedCountry
    ? [{ lon: selectedCountry.longitude, lat: selectedCountry.latitude, label: selectedCountry.name }]
    : [];

  return (
    <div className="site-earth-backdrop" aria-hidden="true">
      <EarthGlobe
        scrollReactive
        markers={markers}
        className="absolute inset-0"
        onCountrySelect={onCountrySelect}
      />
      <span className="site-earth-caption">INTERACTIVE 3D EARTH · CLICK ANY COUNTRY</span>
    </div>
  );
}

export function LandingHero({
  selectedCountryName,
  weatherState,
}: {
  selectedCountryName: string;
  weatherState?: WeatherState;
}) {
  return (
    <section
      className="landing-space relative overflow-hidden border-b border-line"
      style={{ minHeight: 'calc(100svh - 4rem)' }}
    >
      <div className="aurora" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] max-w-7xl items-center justify-between gap-8 px-6 py-16 lg:py-24">
        <div className="max-w-[520px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <div className="glass-option inline-flex items-center gap-2 rounded-full px-3.5 py-1.5">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-dim">
                Earth Intelligence
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.06 }}
            className="text-glow display-font mt-6 max-w-[11ch] text-[48px] font-medium leading-[0.98] tracking-[-0.055em] sm:text-[64px] xl:text-[74px]"
          >
            See what changed. Know why.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.12 }}
            className="mt-5 max-w-md text-[15.5px] leading-[1.7] text-ink-dim"
          >
            Ask a question about any region on Earth and trace it with real satellite evidence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <ButtonLink
              href="/sign-in"
              variant="primary"
              size="lg"
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Start investigating
            </ButtonLink>
            <a
              href="#country-atlas"
              className="glass-option inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl px-6 text-[14px] text-ink hover:text-primary"
            >
              Explore globe
            </a>
          </motion.div>
        </div>

        {/* Right side live weather glass card floating alongside the 3D Earth */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.2 }}
          className="hidden lg:flex flex-col items-end gap-4"
        >
          <WeatherCard
            countryName={selectedCountryName}
            weatherState={weatherState}
            className="w-[260px]"
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            Click any country on the globe
          </span>
        </motion.div>
      </div>
    </section>
  );
}
