'use client';

/**
 * Interactive Country Atlas & Live Weather Card — matching the demo/src/main.ts implementation.
 * Queries live conditions from Open-Meteo at each country's geographic center.
 */

import { useState, useCallback } from 'react';
import { Compass, Info, ArrowUpRight } from 'lucide-react';
import { getCountryRecords } from '@/components/three/earth-globe';

export type WeatherSnapshot = {
  temperature: number;
  rain: number;
  time: string;
  timezone: string;
};

export type WeatherState =
  | { status: 'loading' }
  | { status: 'ready'; data: WeatherSnapshot }
  | { status: 'error' };

const SHORTCUT_COUNTRIES = ['India', 'France', 'Japan', 'Brazil', 'Australia', 'Kenya'];

export function WeatherCard({
  countryName,
  weatherState,
  className = '',
}: {
  countryName: string;
  weatherState?: WeatherState;
  className?: string;
}) {
  const status = weatherState?.status ?? 'loading';
  const snapshot = weatherState?.status === 'ready' ? weatherState.data : undefined;
  const temperature = snapshot ? `${Math.round(snapshot.temperature)}°` : '—°';
  const rainfall = snapshot ? `${Math.max(0, snapshot.rain).toFixed(1)} mm` : '— mm';
  const updated =
    status === 'ready'
      ? `LOCAL TIME ${snapshot?.time.slice(11, 16)} · ${snapshot?.timezone.replace(/_/g, ' ')}`
      : status === 'error'
        ? 'LIVE DATA UNAVAILABLE'
        : 'FETCHING LIVE CONDITIONS…';

  return (
    <aside
      className={`glass-surface rounded-lg p-4 border border-line shadow-lg backdrop-blur-md transition-all ${className} ${status === 'loading' ? 'animate-pulse-soft' : ''}`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-dim">
          <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_0_4px_rgba(134,186,255,0.15)]" />
          LIVE CONDITIONS
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="mt-2.5 font-sans text-[16px] font-bold tracking-tight text-ink">
        {countryName}
      </div>

      <div className="mt-1 flex items-baseline gap-5">
        <div className="font-sans text-[38px] font-medium leading-none tracking-tight text-ink">
          {temperature}
        </div>
        <div className="flex flex-col gap-0.5 pb-1">
          <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-ink-faint">
            RAINFALL / 1 H
          </span>
          <strong className="text-[13px] font-semibold text-primary">
            {rainfall}
          </strong>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2 font-mono text-[7.5px] uppercase tracking-[0.05em] text-ink-faint">
        <span className="truncate">{updated}</span>
        <span className="shrink-0">°C · mm</span>
      </div>
    </aside>
  );
}

export function CountryAtlasSection({
  selectedCountryName,
  weatherState,
  onSelectCountry,
}: {
  selectedCountryName: string;
  weatherState?: WeatherState;
  onSelectCountry: (c: { name: string; latitude: number; longitude: number }) => void;
}) {
  const [countries] = useState<Array<{ name: string; latitude: number; longitude: number }>>(() => {
    return getCountryRecords().map((r) => ({
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  });

  const handleSelectChange = useCallback(
    (name: string) => {
      const found = countries.find((c) => c.name === name);
      if (found) onSelectCountry(found);
    },
    [countries, onSelectCountry],
  );

  return (
    <section id="country-atlas" className="section-band border-b border-line py-14 px-6 sm:px-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_0_4px_rgba(134,186,255,0.15)]" />
              COUNTRY FIELD NOTES · LIVING ATLAS
            </div>
            <h2 className="display-font mt-3 text-[36px] sm:text-[48px] font-semibold leading-[1.05] tracking-tight text-ink">
              Pick a place.<br />
              <em className="font-normal italic text-primary" style={{ fontFamily: 'Georgia, serif' }}>
                Read the sky.
              </em>
            </h2>
          </div>
          <p className="max-w-xs border-l-2 border-primary/40 pl-3 text-[12.5px] leading-relaxed text-ink-dim">
            Choose a country to update its live weather preview. The reference surface stays geographically intact as you explore.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div>
            <label className="flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-dim mb-2">
              <span>EXPLORE A COUNTRY</span>
              <span className="text-ink-faint">WORLDWIDE</span>
            </label>

            <div className="relative">
              <select
                aria-label="Select country for live weather"
                value={selectedCountryName}
                onChange={(e) => handleSelectChange(e.target.value)}
                className="w-full h-11 appearance-none rounded-md border border-line bg-card px-3 text-[13px] text-ink focus:border-primary focus:outline-none"
              >
                {countries.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-3 text-ink-faint">⌄</span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SHORTCUT_COUNTRIES.map((name) => {
                const isSelected = name === selectedCountryName;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelectChange(name)}
                    className={`flex items-center justify-between gap-1.5 rounded-md border px-3 py-2 text-[12px] font-medium transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-line bg-card/60 text-ink-dim hover:border-line-strong hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Compass className={`h-3 w-3 ${isSelected ? 'text-secondary' : 'text-ink-faint'}`} />
                      {name}
                    </span>
                    <ArrowUpRight className="h-3 w-3 opacity-60" />
                  </button>
                );
              })}
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <span className="text-secondary font-bold">+</span>
              Use the country list to select a weather location.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <WeatherCard
              countryName={selectedCountryName}
              weatherState={weatherState}
              className="w-full max-w-[320px]"
            />
          </div>
        </div>

        <div className="mt-8 flex items-start gap-2.5 rounded-md border border-line/60 bg-surface/50 p-3 text-[11px] text-ink-dim">
          <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
          <p className="m-0">
            Weather observations are fetched in real-time from Open-Meteo at each country’s geographic centroid coordinates. Rainfall indicates the current hourly precipitation.
          </p>
        </div>
      </div>
    </section>
  );
}
