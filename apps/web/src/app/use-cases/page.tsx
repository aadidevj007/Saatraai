'use client';

/**
 * Mission Solutions & Use Cases Page
 * Real-world Earth observation scenarios and evidence-backed problem solving.
 */

import { motion } from 'framer-motion';
import { ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing/chrome';
import { UseCasesSection } from '@/components/landing/sections';
import { ButtonLink } from '@/components/ui';

export default function UseCasesPage() {
  return (
    <div className="relative min-h-screen bg-void text-ink">
      <LandingHeader />

      {/* Cyber Hero */}
      <section className="relative overflow-hidden border-b border-line px-6 py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-void to-void" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 backdrop-blur-md"
          >
            <Compass className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary">
              Mission-Critical Operational Domains
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="display-font mt-6 text-[38px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[54px] lg:text-[62px]"
          >
            Built for <span className="text-primary">Investigations</span>, Not Dashboards
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-dim sm:text-[17px]"
          >
            From disaster emergency response to long-term climate attribution. SAATRAAI provides auditable evidence chains
            where high stakes require scientific rigor, not generic AI summaries.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <ButtonLink href="/investigations/new" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Start an Investigation
            </ButtonLink>
            <ButtonLink href="/simulations" variant="outline" size="lg">
              View Simulation Lab
            </ButtonLink>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Grid */}
      <UseCasesSection />

      <LandingFooter />
    </div>
  );
}
