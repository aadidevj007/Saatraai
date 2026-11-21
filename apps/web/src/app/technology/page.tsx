'use client';

/**
 * System Architecture & Technology Page
 * Detailed stack overview, geospatial storage, and deterministic execution pipeline.
 */

import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Database, Network, ShieldCheck, Terminal } from 'lucide-react';
import { LandingHeader, LandingFooter } from '@/components/landing/chrome';
import { TechnologySection } from '@/components/landing/sections';
import { ButtonLink } from '@/components/ui';

export default function TechnologyPage() {
  return (
    <div className="relative min-h-screen bg-void text-ink">
      <LandingHeader />

      {/* Cyber Hero */}
      <section className="relative overflow-hidden border-b border-line px-6 py-20 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-secondary/15 via-void to-void" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3.5 py-1 backdrop-blur-md"
          >
            <Cpu className="h-3.5 w-3.5 text-secondary" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-secondary">
              High-Performance Geospatial Stack
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="display-font mt-6 text-[38px] font-bold leading-[1.05] tracking-tight text-ink sm:text-[54px] lg:text-[62px]"
          >
            A Real Stack, <span className="text-secondary">Wired End-to-End</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-dim sm:text-[17px]"
          >
            Built on PostgreSQL with PostGIS geometry indexing, FastAPI with OpenAPI schemas, Next.js 16
            with Turbopack, and Docker multi-stage containers for sovereign deployment anywhere.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <ButtonLink href="/investigations/new" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              Open Investigation
            </ButtonLink>
            <a
              href="https://github.com/aadidevj007/Saatraai"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface/70 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface"
            >
              GitHub Repository
            </a>
          </motion.div>
        </div>
      </section>

      {/* Tech Breakdown Grid */}
      <TechnologySection />

      {/* Deep Architecture Cards */}
      <section className="border-b border-line bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Sovereignty & Provenance</span>
            <h2 className="display-font mt-2 text-2xl sm:text-3xl font-semibold">Core Architectural Pillars</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="hud-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium text-ink">PostGIS Spatial Truth</h3>
              </div>
              <p className="text-xs text-ink-dim leading-relaxed">
                PostgreSQL with the PostGIS extension serves as the single source of truth for transactional states,
                region bounding boxes, and geometry indices. Cross-user isolation is enforced strictly at the database boundary.
              </p>
            </div>

            <div className="hud-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="h-5 w-5 text-secondary" />
                <h3 className="text-base font-medium text-ink">Cryptographic Provenance Chains</h3>
              </div>
              <p className="text-xs text-ink-dim leading-relaxed">
                Every calculation emitted by tool adapters carries parameter hashes, model run identifiers, and source raster URIs.
                Conclusions are traced back to exact pixel operations without hallucination.
              </p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
