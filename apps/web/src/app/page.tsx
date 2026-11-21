'use client';

/**
 * SAATRAAI main landing page with interactive 3D globe,
 * live atmospheric weather telemetry, scroll-driven unfolding,
 * and pop-in feature sections.
 */

import { useState, useEffect, useCallback } from 'react';
import { LandingFooter, LandingHeader } from '@/components/landing/chrome';
import { LandingEarthBackdrop, LandingHero } from '@/components/landing/hero';
import { CountryAtlasSection, type WeatherState } from '@/components/landing/country-atlas';
import {
  ContradictionSection,
  GraphSection,
  HowItWorks,
  ModalitiesSection,
  PipelineSection,
  ReasoningSection,
  TechnologySection,
  TemporalSection,
  UncertaintySection,
  UseCasesSection,
} from '@/components/landing/sections';

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
      {/* 3D Earth Globe Canvas fixed in background */}
      <LandingEarthBackdrop
        onCountrySelect={handleSelectCountry}
      />

      {/* Main interactive interface and feature layers */}
      <div className="relative z-10">
        <LandingHeader />

        {/* Hero with real-time conditions & Blue Marble orbit */}
        <LandingHero
          selectedCountryName={selectedCountry.name}
          weatherState={weatherState}
        />

        {/* Country Atlas: interactive exploration matching demo */}
        <CountryAtlasSection
          selectedCountryName={selectedCountry.name}
          weatherState={weatherState}
          onSelectCountry={handleSelectCountry}
        />

        {/* Pop-in features of the SAATRAAI platform */}
        <HowItWorks />
        <PipelineSection />
        <ModalitiesSection />
        <ReasoningSection />
        <GraphSection />
        <TemporalSection />
        <ContradictionSection />
        <UncertaintySection />
        <UseCasesSection />
        <TechnologySection />

        <LandingFooter />
      </div>
    </div>
  );
}
