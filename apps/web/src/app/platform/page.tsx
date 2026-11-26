'use client';

/**
 * Platform & Investigation Pipeline Page
 */

import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Terminal, Compass, Network } from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing/chrome';
import { HowItWorks, PipelineSection } from '@/components/landing/sections';
import { ButtonLink, PageTransition } from '@/components/ui';

export default function PlatformPage() {
  return (
    <div className="relative min-h-screen bg-void text-ink">
      <LandingHeader />

      <PageTransition>
        <section className="relative overflow-hidden border-b border-line px-6 py-16 lg:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-void to-void" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="glass-option inline-flex items-center gap-2 rounded-full px-3.5 py-1"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary">
                Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.06 }}
              className="display-font mt-6 text-[36px] font-bold leading-[1.06] tracking-tight text-ink sm:text-[52px]"
            >
              Built for <span className="text-primary">traceable answers</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.12 }}
              className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-dim sm:text-[16px]"
            >
              Turn plain-language questions into step-by-step satellite investigations, with every source and check recorded.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <ButtonLink href="/investigations/new" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Start investigating
              </ButtonLink>
              <ButtonLink href="/simulations" variant="outline" size="lg">
                Try simulation lab
              </ButtonLink>
            </motion.div>
          </div>
        </section>

        <HowItWorks />
        <PipelineSection />

        <section className="border-b border-line bg-surface/50 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Under the hood</span>
              <h2 className="display-font mt-2 text-2xl font-semibold sm:text-3xl">No black-box guesses</h2>
              <p className="mt-2 text-sm text-ink-dim">
                Your questions connect directly to spatial checks and repeatable tools.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="glass-option rounded-xl p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Terminal className="h-5 w-5" />
                </div>
                <h3 className="text-base font-medium text-ink">Repeatable runs</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                  Every run saves its tool version, inputs, area, and timestamps so results can always be checked again.
                </p>
              </div>

              <div className="glass-option rounded-xl p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-secondary/20 bg-secondary/10 text-secondary">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="text-base font-medium text-ink">Exact map boundaries</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                  Regions are stored as real PostGIS shapes, keeping measurements tied to exact coordinates.
                </p>
              </div>

              <div className="glass-option rounded-xl p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Network className="h-5 w-5" />
                </div>
                <h3 className="text-base font-medium text-ink">Conflicting evidence stays visible</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                  If a sensor reading weakens an idea, SAATRAAI flags it instead of sweeping it aside.
                </p>
              </div>
            </div>
          </div>
        </section>
      </PageTransition>

      <LandingFooter />
    </div>
  );
}
