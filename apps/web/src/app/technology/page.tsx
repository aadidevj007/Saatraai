'use client';

/**
 * System Architecture & Technology Page
 */

import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Database, ShieldCheck } from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing/chrome';
import { TechnologySection } from '@/components/landing/sections';
import { ButtonLink, PageTransition } from '@/components/ui';

export default function TechnologyPage() {
  return (
    <div className="relative min-h-screen bg-void text-ink">
      <LandingHeader />

      <PageTransition>
        <section className="relative overflow-hidden border-b border-line px-6 py-16 lg:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/15 via-void to-void" />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="glass-option inline-flex items-center gap-2 rounded-full px-3.5 py-1"
            >
              <Cpu className="h-3.5 w-3.5 text-secondary" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-secondary">
                Technology
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.06 }}
              className="display-font mt-6 text-[36px] font-bold leading-[1.06] tracking-tight text-ink sm:text-[52px]"
            >
              A real stack, <span className="text-secondary">wired end to end</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.12 }}
              className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-dim sm:text-[16px]"
            >
              Next.js on the front, FastAPI and PostgreSQL/PostGIS behind it — keeping every investigation private and verifiable.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <ButtonLink href="/investigations/new" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Open investigation
              </ButtonLink>
              <a
                href="https://github.com/aadidevj007/Saatraai"
                target="_blank"
                rel="noreferrer"
                className="glass-option inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-ink"
              >
                GitHub
              </a>
            </motion.div>
          </div>
        </section>

        <TechnologySection />

        <section className="border-b border-line bg-surface/40 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Core design</span>
              <h2 className="display-font mt-2 text-2xl font-semibold sm:text-3xl">Two things we don’t compromise on</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass-option rounded-xl p-6">
                <div className="mb-3 flex items-center gap-3">
                  <Database className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-medium text-ink">PostGIS spatial storage</h3>
                </div>
                <p className="text-xs leading-relaxed text-ink-dim">
                  Your projects, regions, and records stay in PostgreSQL/PostGIS, with strict ownership checks on every request.
                </p>
              </div>

              <div className="glass-option rounded-xl p-6">
                <div className="mb-3 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-secondary" />
                  <h3 className="text-base font-medium text-ink">Full source trail</h3>
                </div>
                <p className="text-xs leading-relaxed text-ink-dim">
                  Every result keeps the tool name, parameters, and source image ID so nothing appears out of thin air.
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
