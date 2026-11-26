'use client';

/**
 * Mission Solutions & Use Cases Page
 */

import { motion } from 'framer-motion';
import { ArrowRight, Compass } from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing/chrome';
import { UseCasesSection } from '@/components/landing/sections';
import { ButtonLink, PageTransition } from '@/components/ui';

export default function UseCasesPage() {
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
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary">
                Use cases
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.06 }}
              className="display-font mt-6 text-[36px] font-bold leading-[1.06] tracking-tight text-ink sm:text-[52px]"
            >
              Made for <span className="text-primary">investigations</span>, not just charts
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.12 }}
              className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-dim sm:text-[16px]"
            >
              From sudden floods to long-term urban growth, keep every piece of evidence organized and easy to verify.
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

        <UseCasesSection />
      </PageTransition>

      <LandingFooter />
    </div>
  );
}
