'use client';

/**
 * Platform & Investigation Pipeline Page
 * Dedicated deep-dive into the 14-stage auditable intelligence pipeline.
 */

import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Terminal, Compass, Network } from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing/chrome';
import { HowItWorks, PipelineSection } from '@/components/landing/sections';
import { ButtonLink } from '@/components/ui';

export default function PlatformPage() {
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
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary">
              Deterministic Intelligence Engine
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="display-font mt-6 text-[38px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[54px] lg:text-[62px]"
          >
            The 14-Stage <span className="text-primary">Auditable Pipeline</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-dim sm:text-[17px]"
          >
            From natural language question to mathematical geospatial verification. Every step produces
            cryptographically signed execution traces, verifiable coordinates, and strict provenance records.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <ButtonLink href="/investigations/new" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Launch Pipeline
            </ButtonLink>
            <ButtonLink href="/simulations" variant="outline" size="lg">
              Test in Simulation Lab
            </ButtonLink>
          </motion.div>
        </div>
      </section>

      {/* Main sections */}
      <HowItWorks />
      <PipelineSection />

      {/* Architecture Deep Dive */}
      <section className="border-b border-line bg-surface/50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Zero Black-Box Assertions</span>
            <h2 className="display-font mt-2 text-2xl sm:text-3xl font-semibold">How Truth is Guaranteed at Runtime</h2>
            <p className="mt-2 text-sm text-ink-dim">
              Traditional LLMs guess geospatial causality. SAATRAAI binds natural language hypotheses directly to deterministic Python raster kernels and PostGIS spatial intersections.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="hud-border rounded-xl p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                <Terminal className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-ink">Idempotent Execution Traces</h3>
              <p className="mt-2 text-xs text-ink-dim leading-relaxed">
                Every sensor execution is hashed with tool version, input parameters, bounding box, and timestamps. Rerunning the task reproduces the exact numeric output.
              </p>
            </div>

            <div className="hud-border rounded-xl p-6">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary mb-4">
                <Compass className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-ink">PostGIS Spatial Verification</h3>
              <p className="mt-2 text-xs text-ink-dim leading-relaxed">
                Spatial assertions must evaluate against indexed geometries. Hypotheses regarding water expansion are measured against validated coordinate polygons.
              </p>
            </div>

            <div className="hud-border rounded-xl p-6">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Network className="h-5 w-5" />
              </div>
              <h3 className="text-base font-medium text-ink">Explicit Falsification Matrix</h3>
              <p className="mt-2 text-xs text-ink-dim leading-relaxed">
                If dry-season radar backscatter contradicts a rainfall hypothesis, the engine highlights the conflict instead of discarding it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

