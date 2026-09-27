'use client';

/** Landing hero. */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Telescope } from 'lucide-react';

import { EarthVisual } from '@/components/auth/earth-visual';
import { Button } from '@/components/ui';

const TAGLINE = ['OBSERVE.', 'INVESTIGATE.', 'VERIFY.', 'EXPLAIN.'];

const TELEMETRY = [
  { k: 'ROI', v: 'POLYGON / BBOX / DRAWN' },
  { k: 'TEMPORAL', v: 'MULTI-YEAR STACKS' },
  { k: 'PROVENANCE', v: 'TASK · TOOL · VERSION' },
  { k: 'FALSIFICATION', v: 'CONTRADICTION SEARCH' },
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* moving scanline */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-scan absolute inset-x-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(34,211,238,0.05),transparent)]" />
      </div>
      <div className="pointer-events-none absolute -right-32 top-1/4 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.08),transparent_65%)]" />

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
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
            className="mt-6 font-mono text-[38px] font-semibold leading-none tracking-[0.2em] text-ink sm:text-[52px]"
          >
            SAATRAAI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-4 max-w-xl text-[14px] leading-relaxed text-ink-dim"
          >
            <span className="text-ink">Satellite AI for Autonomous Temporal Reasoning and Analysis of Intelligence</span>{' '}
            — an evidence-driven Earth observation investigator for hypothesis-based spatio-temporal analysis.
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
                style={{ color: i % 2 === 0 ? '#22d3ee' : '#93a7bc' }}
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
            <Link href="/sign-in">
              <Button variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Start investigation
              </Button>
            </Link>
            <a href="#pipeline">
              <Button variant="secondary" size="lg">
                Explore SAATRAAI
              </Button>
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
          className="flex items-center justify-center"
        >
          <EarthVisual />
        </motion.div>
      </div>

      <div className="flex justify-center pb-6 text-ink-faint">
        <ChevronDown className="h-4 w-4 animate-float" />
      </div>
    </section>
  );
}
