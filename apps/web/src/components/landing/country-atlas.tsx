'use client';

/**
 * Interactive Country Atlas & Live Weather Card.
 */

import { useState, useCallback } from 'react';
import { Compass, ArrowUpRight } from 'lucide-react';
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
      ? `${snapshot?.time.slice(11, 16)} · ${snapshot?.timezone.replace(/_/g, ' ')}`
      : status === 'error'
        ? 'Weather unavailable'
        : 'Checking weather…';

  return (
    <aside
      className={`glass-surface rounded-xl p-4 transition-all ${className} ${status === 'loading' ? 'animate-pulse-soft' : ''}`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-dim">
          <span className="h-2 w-2 rounded-full bg-secondary shadow-[0_0_0_4px_rgba(134,186,255,0.15)]" />
          Live weather
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="mt-2.5 font-sans text-[16px] font-semibold tracking-tight text-ink">
        {countryName}
      </div>

      <div className="mt-1 flex items-baseline gap-5">
        <div className="font-sans text-[38px] font-medium leading-none tracking-tight text-ink">
          {temperature}
        </div>
        <div className="flex flex-col gap-0.5 pb-1">
          <span className="font-mono text-[7.5px] uppercase tracking-[0.1em] text-ink-faint">
            Rain / 1h
          </span>
          <strong className="text-[13px] font-semibold text-primary">
            {rainfall}
          </strong>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-2 font-mono text-[8px] uppercase tracking-[0.05em] text-ink-faint">
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
    <section id="country-atlas" className="section-band border-b border-line py-14 px-6 sm:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-primary">
              Living Atlas
            </p>
            <h2 className="display-font mt-2 text-[30px] sm:text-[40px] font-semibold leading-[1.08] tracking-tight text-ink">
              Pick a country, check live conditions.
            </h2>
          </div>
          <p className="max-w-xs text-[12.5px] leading-relaxed text-ink-dim">
            Select a country below or click directly on the 3D globe.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div>
            <div className="relative">
              <select
                aria-label="Select country for live weather"
                value={selectedCountryName}
                onChange={(e) => handleSelectChange(e.target.value)}
                className="glass-option h-11 w-full appearance-none rounded-xl px-3.5 text-[13px] text-ink focus:border-primary focus:outline-none"
              >
                {countries.map((c) => (
                  <option key={c.name} value={c.name} className="bg-surface text-ink">
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3.5 top-3 text-ink-faint">⌄</span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SHORTCUT_COUNTRIES.map((name) => {
                const isSelected = name === selectedCountryName;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelectChange(name)}
                    className={`flex items-center justify-between gap-1.5 rounded-xl px-3 py-2.5 text-[12.5px] font-medium active:scale-[0.97] ${
                      isSelected
                        ? 'glass-option-active text-white font-semibold'
                        : 'glass-option text-ink-dim hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Compass className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-ink-faint'}`} />
                      {name}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <WeatherCard
              countryName={selectedCountryName}
              weatherState={weatherState}
              className="w-full max-w-[320px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
