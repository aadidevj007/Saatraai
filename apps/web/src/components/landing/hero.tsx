'use client';

/**
 * Landing hero & story — layout mirrors demo/src/main.ts exactly:
 *   • Full-screen fixed canvas behind everything
 *   • Live weather card in hero & story section
 *   • Coordinates & orbital view telemetry
 *   • 250svh scroll story with sticky panel + globe unfold
 *   • Interactive country selection
 */

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Telescope } from 'lucide-react';
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
  onCountrySelect,
}: {
  onCountrySelect?: (c: { name: string; latitude: number; longitude: number }) => void;
}) {
  return (
    <div className="site-earth-backdrop" aria-hidden="true">
      <EarthGlobe
        scrollReactive
        className="absolute inset-0"
        onCountrySelect={onCountrySelect}
      />
      <span className="site-earth-caption">REFERENCE EARTH · BLUE MARBLE · NOT LIVE IMAGERY</span>
    </div>
  );
}

const TAGLINE = ['OBSERVE.', 'INVESTIGATE.', 'VERIFY.', 'EXPLAIN.'];

const TELEMETRY = [
  { k: 'ROI', v: 'POLYGON / BBOX / DRAWN' },
  { k: 'TEMPORAL', v: 'USER-DEFINED WINDOW' },
  { k: 'PROVENANCE', v: 'TASK · TOOL · VERSION' },
  { k: 'FALSIFICATION', v: 'CONTRADICTION SEARCH' },
];

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

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] max-w-7xl items-center justify-between px-6 py-16 lg:py-24">
        <div className="max-w-[560px]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1 backdrop-blur-md">
              <Telescope className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-dim">
                Evidence-driven Earth observation
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="text-glow display-font mt-6 max-w-[12ch] text-[48px] font-medium leading-[0.98] tracking-[-0.055em] sm:text-[64px] xl:text-[76px]"
          >
            Investigate Earth with evidence.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-5 max-w-lg text-[15px] leading-[1.75] text-ink-dim sm:text-[16px]"
          >
            Ask questions about changing regions. SAATRAAI organizes multimodal imagery, competing hypotheses, provenance and falsification gaps into auditable intelligence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 flex flex-wrap gap-x-5 gap-y-2"
          >
            {TAGLINE.map((word, i) => (
              <span
                key={word}
                className="font-mono text-[14.5px] font-semibold tracking-[0.22em]"
                style={{
                  color:
                    i === 0 ? '#5df0a8'
                    : i === 1 ? '#9aa6c4'
                    : i === 2 ? '#8ee9ff'
                    : '#f3f6ff',
                }}
              >
                {word}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <ButtonLink
              href="/sign-in"
              variant="primary"
              size="lg"
              icon={<ArrowRight className="h-4 w-4" />}
            >
              Start investigation
            </ButtonLink>
            <a
              href="#country-atlas"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-line-strong bg-elevated/80 backdrop-blur-md px-6 text-[14px] text-ink transition-colors hover:border-primary/50 hover:text-primary"
            >
              Country atlas
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 border-t border-line/80 pt-5"
          >
            {TELEMETRY.map((item) => (
              <div key={item.k}>
                <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">{item.k}</dt>
                <dd className="font-mono text-[11px] uppercase tracking-[0.1em] text-primary/85">{item.v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* Right side telemetry & live weather card matching demo */}
        <div className="hidden lg:flex flex-col items-end gap-6">
          <div className="flex flex-col items-end font-mono text-[9px] text-ink-faint tracking-widest gap-1">
            <span>34° N</span>
            <span className="h-8 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
            <span>11° E</span>
          </div>

          <WeatherCard
            countryName={selectedCountryName}
            weatherState={weatherState}
            className="w-[260px]"
          />

          <div className="flex items-center gap-4 font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">
            <span>EARTH / 001</span>
            <span className="h-2 w-px bg-line" />
            <span>REFERENCE GLOBE · BLUE MARBLE</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-5 text-ink-faint">
        <ChevronDown className="h-4 w-4 animate-float" />
      </div>
    </section>
  );
}

const STORY_STEPS = [
  {
    kicker: '01 / ORBIT',
    title: 'One world.',
    titleEm: 'In motion.',
    body: 'Every satellite pass and imagery swath belongs to a larger pattern. Start with the whole planet — turning beneath a thin blue atmosphere.',
  },
  {
    kicker: '02 / UNFOLD',
    title: 'Boundaries',
    titleEm: 'begin to breathe.',
    body: 'Move closer. The familiar globe opens into region-shaped fragments, each holding its evidence in the global picture.',
  },
  {
    kicker: '03 / INVESTIGATE',
    title: 'Find your',
    titleEm: 'answer here.',
    body: 'Pick a region, define the time window, and let SAATRAAI route the question through hypotheses, evidence and provenance.',
  },
];

export function LandingStory({
  selectedCountryName,
  weatherState,
}: {
  selectedCountryName: string;
  weatherState?: WeatherState;
}) {
  const storyRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = storyRef.current;
      if (!el) return;
      const start = el.offsetTop;
      const length = Math.max(1, el.offsetHeight - window.innerHeight);
      const p = Math.max(0, Math.min(1, (window.scrollY - start) / length));
      setProgress(p);
      setActiveStep(p < 0.28 ? 0 : p < 0.72 ? 1 : 2);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      ref={storyRef}
      className="demo-story relative border-b border-line"
      style={{ height: '240svh' }}
      aria-label="The platform unfolds as you scroll"
    >
      <div
        className="sticky top-0 overflow-hidden"
        style={{ height: '100svh', minHeight: 640 }}
      >
        <div
          className="absolute flex flex-col items-center gap-4 text-ink-faint"
          style={{ left: 'clamp(22px, 5.5vw, 92px)', top: '50%', transform: 'translateY(-50%)' }}
        >
          <span
            className="font-mono text-[8px] uppercase tracking-[0.16em] text-ink-faint"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            A CLOSER LOOK
          </span>
          <span className="h-12 w-px bg-gradient-to-b from-transparent via-ink-faint/40 to-transparent" />
          <span className="font-mono text-[8px] text-ink-faint">01—03</span>
        </div>

        <div
          className="absolute"
          style={{
            left: 'clamp(78px, 12vw, 195px)',
            top: '24%',
            width: 'min(370px, 34vw)',
          }}
        >
          {STORY_STEPS.map((step, index) => (
            <div
              key={step.kicker}
              className="absolute inset-0 transition-all duration-700 pointer-events-none"
              style={{
                opacity: index === activeStep ? 1 : 0,
                transform: index === activeStep ? 'translateY(0)' : 'translateY(15px)',
              }}
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-secondary">
                {step.kicker}
              </span>
              <h2 className="display-font mt-5 text-[clamp(40px,5vw,66px)] font-semibold leading-[1.03] tracking-[-0.07em] text-ink" style={{ marginLeft: -3 }}>
                {step.title}
                <br />
                <em className="font-normal italic text-primary" style={{ fontFamily: 'Georgia, Times New Roman, serif', letterSpacing: '-0.08em' }}>
                  {step.titleEm}
                </em>
              </h2>
              <p className="mt-4 w-[300px] text-[12.5px] leading-[1.8] text-ink-dim">{step.body}</p>
            </div>
          ))}
        </div>

        {/* Story weather widget */}
        <div
          className="hidden md:block absolute"
          style={{ right: 'clamp(22px, 7.5vw, 124px)', bottom: 85 }}
        >
          <WeatherCard
            countryName={selectedCountryName}
            weatherState={weatherState}
            className="w-[250px]"
          />
        </div>

        <div
          className="absolute flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.07em] text-ink-faint"
          style={{ right: 'clamp(22px, 5.5vw, 92px)', bottom: 35 }}
        >
          <span>EARTH /</span>
          <span className="h-px w-[105px] bg-line-strong relative overflow-hidden">
            <span
              className="absolute inset-y-0 left-0 bg-primary transition-transform duration-200"
              style={{ transform: `scaleX(${Math.max(0.06, progress)})`, transformOrigin: 'left' }}
            />
          </span>
          <span>
            <strong className="text-primary font-normal">{String(activeStep + 1).padStart(2, '0')}</strong>
            {' / 03'}
          </span>
        </div>

        <div
          className="absolute flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint"
          style={{ bottom: 35, left: 'clamp(78px, 12vw, 195px)' }}
        >
          <span className="relative h-[22px] w-[14px] rounded-[9px] border border-ink-faint/40">
            <span
              className="absolute left-[5px] top-[4px] h-[5px] w-[2px] rounded-sm bg-primary"
              style={{ animation: 'scrollDot 1.2s ease-in-out infinite' }}
            />
          </span>
          SCROLL TO UNFOLD
        </div>
      </div>

      <style>{`
        @keyframes scrollDot { to { transform: translateY(6px); opacity: 0.2; } }
      `}</style>
    </section>
  );
}
