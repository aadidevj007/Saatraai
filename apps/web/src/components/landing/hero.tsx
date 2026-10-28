'use client';

/** Landing hero. */

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Telescope } from 'lucide-react';

import { ButtonLink } from '@/components/ui';

const EarthGlobe = dynamic(
  () => import('@/components/three/earth-globe').then((m) => m.EarthGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full max-w-[520px] items-center justify-center">
        <div className="h-40 w-40 animate-pulse-soft rounded-full border border-primary/20 bg-primary/5" />
      </div>
    ),
  },
);

const TAGLINE = ['OBSERVE.', 'INVESTIGATE.', 'VERIFY.', 'EXPLAIN.'];

const TELEMETRY = [
  { k: 'ROI', v: 'POLYGON / BBOX / DRAWN' },
  { k: 'TEMPORAL', v: 'USER-DEFINED WINDOW' },
  { k: 'PROVENANCE', v: 'TASK · TOOL · VERSION' },
  { k: 'FALSIFICATION', v: 'CONTRADICTION SEARCH' },
];

export function LandingHero() {
  return (
    <section className="landing-space relative overflow-hidden border-b border-line">
      {/* ambient depth */}
      <div className="aurora" aria-hidden />
      <div className="pointer-events-none absolute -right-32 top-1/4 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(181,31,45,0.08),transparent_65%)]" />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1">
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
            className="text-glow display-font mt-7 max-w-[12ch] text-[48px] font-medium leading-[0.98] tracking-[-0.055em] sm:text-[64px] xl:text-[76px]"
          >
            Investigate Earth with evidence.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-5 max-w-lg text-[15px] leading-[1.75] text-ink-dim sm:text-[16px]"
          >
            Ask a question about a place and time. SAATRAAI organizes the imagery, hypotheses, provenance, and evidence gaps so every conclusion stays auditable.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-7 flex flex-wrap gap-x-5 gap-y-2"
          >
            {TAGLINE.map((word, i) => (
              <span
                key={word}
                className="font-mono text-[15px] font-semibold tracking-[0.22em]"
                style={{ color: i === 0 ? '#ff5447' : i === 1 ? '#aaa6ad' : i === 2 ? '#ff9a70' : '#f2eff0' }}
              >
                {word}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <ButtonLink href="/sign-in" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Start investigation
            </ButtonLink>
            <a
              href="#pipeline"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-line-strong bg-elevated px-6 text-[14px] text-ink transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Explore SAATRAAI
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 grid max-w-lg grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-6"
          >
            {TELEMETRY.map((item) => (
              <div key={item.k}>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">{item.k}</dt>
                <dd className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-primary/85">{item.v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative flex items-center justify-center"
        >
          <div className="glow-edge hero-orbit relative aspect-square w-full max-w-[540px] rounded-full border border-white/[0.06] bg-void/30 backdrop-blur-[2px]">
            <EarthGlobe
              markers={[
                { lon: 77.55, lat: 9.17 },
                { lon: 80.27, lat: 13.08 },
                { lon: 88.36, lat: 22.57 },
              ]}
              satellites={3}
              className="absolute inset-0"
            />
            <span className="absolute bottom-[8%] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-void/80 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint backdrop-blur-md">
              Illustrative globe · no live observations
            </span>
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 flex justify-center pb-6 text-ink-faint">
        <ChevronDown className="h-4 w-4 animate-float" />
      </div>
    </section>
  );
}
