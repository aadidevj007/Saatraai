'use client';

/** Landing content sections — human, minimal copy with pop-in animations. */

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarRange,
  Database,
  GitBranch,
  Layers,
  Radar,
  SearchCheck,
  Waypoints,
} from 'lucide-react';

import { Badge, ButtonLink, TiltCard } from '@/components/ui';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const popIn = {
  hidden: { opacity: 0, scale: 0.94, y: 18 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0 },
};

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  alt,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section id={id} className={`section-band border-b border-line ${alt ? 'bg-surface/70' : ''}`}>
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.45 }}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
          <h2 className="display-font mt-2.5 max-w-2xl text-[24px] font-semibold leading-[1.14] text-ink sm:text-[30px]">
            {title}
          </h2>
          {description && (
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-dim">{description}</p>
          )}
        </motion.div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/* ── 1. How it works ── */

const STEPS = [
  { n: '01', t: 'Ask a question', d: 'Start in plain language, like asking why flooding grew over recent years.' },
  { n: '02', t: 'Pick region & dates', d: 'Draw an area on the map or upload GeoJSON, then choose a time range.' },
  { n: '03', t: 'List explanations', d: 'Track possible causes side by side with clear status labels.' },
  { n: '04', t: 'Gather evidence', d: 'Run tools on your imagery and save every step with its source.' },
  { n: '05', t: 'Check conflicts', d: 'See what agrees, what disagrees, and what data is still missing.' },
];

export function HowItWorks() {
  return (
    <Section
      eyebrow="How it works"
      title="From question to clear evidence"
      description="Every step saves real records — your questions, runs, evidence, and takeaways."
    >
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.n}
            variants={popIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: i * 0.06 }}
          >
            <TiltCard maxTilt={6} className="h-full rounded-xl">
              <div className="glass-option h-full rounded-xl p-4">
                <div className="font-mono text-[11px] tracking-[0.2em] text-primary">{step.n}</div>
                <div className="mt-2 text-[13.5px] font-medium text-ink">{step.t}</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-dim">{step.d}</p>
              </div>
            </TiltCard>
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}

/* ── 2. Pipeline ── */

const PIPELINE = [
  'Question',
  'Region',
  'Time range',
  'Hypotheses',
  'Plan',
  'Data upload',
  'Imagery check',
  'Timeline',
  'Contradictions',
  'Gaps',
  'Confidence',
  'Graph',
  'Summary',
  'Export',
];

export function PipelineSection() {
  return (
    <Section
      id="pipeline"
      alt
      eyebrow="Pipeline"
      title="Fourteen clear steps from start to report"
      description="Each stage shows live status from the server — anything not available is marked plainly, never faked."
    >
      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE.map((stage, i) => (
          <motion.div
            key={stage}
            variants={popIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: Math.min(i * 0.03, 0.4) }}
            className="flex items-center gap-2"
          >
            <span className="glass-option rounded-lg px-3 py-2 text-[12px] text-ink-dim">
              <span className="mr-2 font-mono text-[10px] text-primary/80">
                {String(i + 1).padStart(2, '0')}
              </span>
              {stage}
            </span>
            {i < PIPELINE.length - 1 && <ArrowRight className="h-3 w-3 text-ink-faint" />}
          </motion.div>
        ))}
      </div>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="mt-6 rounded-xl border border-warning/25 bg-warning/5 p-4 text-[12.5px] leading-relaxed text-ink-dim"
      >
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-warning">Honesty check · </span>
        When a model or data source isn’t connected, that step is marked NOT CONFIGURED and INSUFFICIENT rather than guessing.
      </motion.div>
    </Section>
  );
}

/* ── 3. Modalities ── */

const MODALITIES = [
  { icon: Radar, t: 'SAR radar', d: 'See floods and surface changes even through heavy cloud cover.', note: 'Upload scenes' },
  { icon: Layers, t: 'Optical', d: 'Multispectral views for water, vegetation, and city growth.', note: 'Upload scenes' },
  { icon: Database, t: 'Rainfall', d: 'Compare rain patterns with surface changes on the ground.', note: 'Provider status' },
  { icon: Waypoints, t: 'Terrain / DEM', d: 'Check slope and elevation to see where water naturally flows.', note: 'Provider status' },
  { icon: GitBranch, t: 'Land cover', d: 'Spot shifts between forest, farmland, water, and built areas.', note: 'Provider status' },
  { icon: SearchCheck, t: 'Infrastructure', d: 'Factor in roads, drains, and built structures.', note: 'Provider status' },
];

export function ModalitiesSection() {
  return (
    <Section
      id="modalities"
      eyebrow="Data layers"
      title="Different ways of seeing the Earth"
      description="We show what you can run today versus what still needs a provider connection."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODALITIES.map((m, i) => (
          <motion.div
            key={m.t}
            variants={popIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: i * 0.06 }}
          >
            <TiltCard maxTilt={7} className="h-full rounded-xl">
              <div className="glass-option h-full rounded-xl p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                    <m.icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="text-[13.5px] font-medium text-ink">{m.t}</span>
                </div>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-dim">{m.d}</p>
                <div className="mt-3">
                  <Badge tone="warning">{m.note}</Badge>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ── 4. Reasoning ── */

const REASONING = [
  { t: 'Track ideas clearly', d: 'Every idea starts untested and moves to supported, weakened, or contradicted.' },
  { t: 'Show every side', d: 'Each record states whether it supports, challenges, or lacks enough data.' },
  { t: 'Try to disprove', d: 'Conflicting findings stay front and center so weak ideas aren’t hidden.' },
  { t: 'Spot missing pieces', d: 'If key data isn’t available yet, it stays listed as NOT AVAILABLE.' },
];

export function ReasoningSection() {
  return (
    <Section
      id="reasoning"
      alt
      eyebrow="Reasoning"
      title="Built to test ideas, not jump to conclusions"
      description="Claims only hold as much weight as the records backing them up."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {REASONING.map((r, i) => (
          <motion.div
            key={r.t}
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.08 }}
            className="glass-option rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-secondary" />
              <span className="text-[13.5px] font-medium text-ink">{r.t}</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">{r.d}</p>
          </motion.div>
        ))}
      </div>
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="mt-6 max-w-2xl border-l-2 border-primary/50 pl-4 text-[13px] italic leading-relaxed text-ink-dim"
      >
        &ldquo;Available evidence points toward…&rdquo; — never &ldquo;proven.&rdquo; Patterns in imagery are shown alongside what still needs checking.
      </motion.p>
    </Section>
  );
}

/* ── 5. Evidence graph ── */

const GRAPH_NODES = ['Question', 'Hypothesis', 'Evidence', 'Dataset', 'Model run', 'Conclusion'];
const GRAPH_EDGES = ['SUPPORTS', 'CONTRADICTS', 'DERIVED_FROM', 'ANALYZES', 'PRODUCES', 'CONCLUDES'];

export function GraphSection() {
  return (
    <Section
      eyebrow="Evidence graph"
      title="Follow every link back to its source"
      description="Questions, scenes, tool runs, and conclusions connect in one navigable map."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          variants={popIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="glass-option rounded-xl p-5"
        >
          <div className="flex flex-wrap gap-2">
            {GRAPH_NODES.map((n, i) => (
              <motion.span
                key={n}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="glass-option-active rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white"
              >
                {n}
              </motion.span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {GRAPH_EDGES.map((e, i) => (
              <motion.span
                key={e}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: 0.2 + i * 0.04 }}
                className="rounded border border-line bg-elevated px-2 py-1 font-mono text-[10.5px] text-ink-dim"
              >
                {e}
              </motion.span>
            ))}
          </div>
        </motion.div>
        <motion.div
          variants={slideInLeft}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}
          className="glass-option rounded-xl p-5"
        >
          <div className="space-y-3 text-[12.5px] leading-relaxed text-ink-dim">
            <p>
              <span className="text-ink">Question → run → evidence → takeaway.</span> Each link keeps the tool name, version, and time it ran.
            </p>
            <p>
              Runs that fail or lack a model stay recorded as INSUFFICIENT so gaps are always easy to spot.
            </p>
          </div>
          <ButtonLink href="/sign-in" className="mt-4" variant="secondary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            Open graph
          </ButtonLink>
        </motion.div>
      </div>
    </Section>
  );
}

/* ── 6. Temporal ── */

export function TemporalSection() {
  return (
    <Section
      alt
      eyebrow="Time window"
      title="Compare scenes across the dates you choose"
      description="Every scene, run, and finding sits on a shared timeline connected to the map."
    >
      <motion.div
        variants={popIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="glass-option rounded-xl p-5"
      >
        <div className="flex items-center gap-3">
          <CalendarRange className="h-4 w-4 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-dim">
            Timeline · preset or custom dates
          </span>
        </div>
        <div className="mt-5 flex items-center gap-1.5">
          {[
            { y: '2022', w: 52 },
            { y: '2023', w: 68 },
            { y: '2024', w: 84 },
            { y: '2025', w: 61 },
            { y: '2026', w: 73 },
          ].map(({ y, w }, i) => (
            <motion.div
              key={y}
              className="flex-1"
              initial={{ opacity: 0, scaleY: 0 }}
              whileInView={{ opacity: 1, scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              style={{ transformOrigin: 'bottom' }}
            >
              <div className="h-1.5 rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-dim to-primary"
                  style={{ width: `${w}%` }}
                />
              </div>
              <div className="mt-1.5 text-center font-mono text-[10px] text-ink-faint">{y}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* ── 7. Contradiction search ── */

export function ContradictionSection() {
  return (
    <Section
      eyebrow="Contradictions"
      title="Evidence that disagrees matters most"
      description="Every idea is shown alongside the observations that challenge it."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { tone: 'text-success', label: 'SUPPORTING', d: 'Matches the working explanation.' },
          { tone: 'text-danger', label: 'CONTRADICTING', d: 'Pushes back or weakens the claim.' },
          { tone: 'text-warning', label: 'INSUFFICIENT', d: 'Not enough data or tool unavailable.' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            variants={popIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: i * 0.08 }}
            className="glass-option rounded-xl p-4"
          >
            <div className={`font-mono text-[11px] tracking-[0.16em] ${item.tone}`}>{item.label}</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">{item.d}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ── 8. Uncertainty ── */

export function UncertaintySection() {
  return (
    <Section
      alt
      eyebrow="Confidence & gaps"
      title="Clear confidence, plus what’s still missing"
      description="Scores show how they were calculated and list any missing data alongside them."
    >
      <motion.div
        variants={popIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="glass-option rounded-xl p-5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="space-y-2 text-[12.5px] leading-relaxed text-ink-dim">
            <p>
              <span className="text-ink">Coverage</span> — how many runs returned a real observation.
            </p>
            <p>
              <span className="text-ink">Pushback</span> — records that disagree with the leading idea.
            </p>
            <p>
              <span className="text-ink">Missing data</span> — listed clearly as NOT AVAILABLE, never guessed.
            </p>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

/* ── 9. Use cases ── */

const USE_CASES = [
  { t: 'Flooding', d: 'Separate rainfall spikes, land changes, and drainage issues.' },
  { t: 'City growth', d: 'Check if new construction lines up with heat or runoff shifts.' },
  { t: 'Vegetation loss', d: 'Tell drought stress apart from clearing or land use change.' },
  { t: 'Disaster response', d: 'Compare before and after scenes while flagging data gaps.' },
  { t: 'Coastlines', d: 'Track shoreline erosion without assuming a single cause.' },
  { t: 'Research review', d: 'Keep clean evidence trails ready for peer review.' },
];

export function UseCasesSection() {
  return (
    <Section
      id="use-cases"
      eyebrow="Use cases"
      title="Made for real questions, not static charts"
      description="Explore competing explanations in one focused workspace."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((u, i) => (
          <motion.div
            key={u.t}
            variants={popIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: i * 0.06 }}
          >
            <TiltCard maxTilt={7} className="h-full rounded-xl">
              <div className="glass-option h-full rounded-xl p-4">
                <div className="text-[13.5px] font-medium text-ink">{u.t}</div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">{u.d}</p>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ── 10. Technology ── */

const TECH = [
  { k: 'Web', v: 'Next.js · React · TypeScript' },
  { k: 'Maps', v: 'MapLibre GL · GeoJSON' },
  { k: 'Backend', v: 'FastAPI · JWT auth' },
  { k: 'Database', v: 'PostgreSQL / PostGIS' },
  { k: 'Routing', v: 'Tool registry · Execution traces' },
  { k: 'Models', v: 'GeoChat VQA · Grounding' },
];

export function TechnologySection() {
  return (
    <Section
      id="technology"
      alt
      eyebrow="Stack"
      title="Simple, solid, connected end to end"
      description="A Next.js workspace backed by FastAPI and PostGIS for real geospatial records."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TECH.map((t, i) => (
          <motion.div
            key={t.k}
            variants={popIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: i * 0.05 }}
            className="glass-option flex items-baseline justify-between gap-3 rounded-lg px-4 py-3"
          >
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">{t.k}</span>
            <span className="text-right text-[12.5px] text-ink-dim">{t.v}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={popIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.2 }}
        className="glow-edge mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center backdrop-blur-md"
      >
        <p className="text-[15px] font-medium text-ink">Ready to try it?</p>
        <p className="mx-auto mt-1.5 max-w-md text-[12.5px] text-ink-dim">
          Sign in with Google, pick an area, and start testing your question.
        </p>
        <ButtonLink href="/sign-in" className="mt-4" variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
          Start investigating
        </ButtonLink>
      </motion.div>
    </Section>
  );
}
