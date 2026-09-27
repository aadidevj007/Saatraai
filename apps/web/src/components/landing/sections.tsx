'use client';

/** Landing content sections. */

import Link from 'next/link';
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

import { Badge, Button, TiltCard } from '@/components/ui';

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
    <section id={id} className={`border-b border-line ${alt ? 'bg-surface' : ''}`}>
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 max-w-2xl text-[24px] font-semibold leading-tight text-ink sm:text-[28px]">{title}</h2>
          {description && <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-dim">{description}</p>}
        </motion.div>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}

/* ── 1. How it works ── */

const STEPS = [
  { n: '01', t: 'Ask in natural language', d: '“Why has flooding increased in this region between 2022 and 2026?”' },
  { n: '02', t: 'Define region + time', d: 'Draw a polygon, pick a preset, or upload GeoJSON; choose the temporal window.' },
  { n: '03', t: 'Plan hypotheses', d: 'Candidate explanations are registered with explicit assessment states.' },
  { n: '04', t: 'Collect evidence', d: 'Registered tools execute against your imagery and emit provenance-carrying evidence.' },
  { n: '05', t: 'Challenge & explain', d: 'Contradictions, missing evidence and confidence are reported — never hidden.' },
];

export function HowItWorks() {
  return (
    <Section
      eyebrow="How SAATRAAI works"
      title="A question becomes an auditable evidence chain"
      description="Every stage of an investigation is real application state — persisted queries, execution traces, evidence records and conclusions, each with provenance."
    >
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.n}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <TiltCard maxTilt={6} className="h-full rounded-xl">
              <div className="h-full rounded-xl border border-line bg-card p-4 transition-colors hover:border-primary/30">
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
  'Query understanding',
  'Region identification',
  'Temporal scope',
  'Hypothesis generation',
  'Evidence planning',
  'Data acquisition',
  'Remote sensing analysis',
  'Temporal analysis',
  'Contradiction search',
  'Missing evidence',
  'Confidence',
  'Evidence graph',
  'Conclusion',
  'Report export',
];

export function PipelineSection() {
  return (
    <Section
      id="pipeline"
      alt
      eyebrow="Investigation pipeline"
      title="Fourteen stages, one traceable path from question to report"
      description="Statuses are driven by backend records wherever they exist — steps that this deployment cannot execute are labelled, not simulated."
    >
      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE.map((stage, i) => (
          <motion.div
            key={stage}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.5) }}
            className="flex items-center gap-2"
          >
            <span className="rounded-lg border border-line bg-card px-3 py-2 text-[12px] text-ink-dim">
              <span className="mr-2 font-mono text-[10px] text-primary/70">
                {String(i + 1).padStart(2, '0')}
              </span>
              {stage}
            </span>
            {i < PIPELINE.length - 1 && <ArrowRight className="h-3 w-3 text-ink-faint" />}
          </motion.div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-warning/25 bg-warning/5 p-4 text-[12.5px] leading-relaxed text-ink-dim">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-warning">Integrity rule · </span>
        When a provider or model is not configured, the corresponding stage reports NOT CONFIGURED and evidence
        records are marked INSUFFICIENT instead of inventing a result.
      </div>
    </Section>
  );
}

/* ── 3. Modalities ── */

const MODALITIES = [
  { icon: Radar, t: 'SAR', d: 'Sentinel-1 dual-polarisation backscatter for flood extent and structure change under cloud.', note: 'Provider not configured — upload scenes' },
  { icon: Layers, t: 'Optical', d: 'Sentinel-2 multispectral stacks for vegetation, built-up and water mapping.', note: 'Provider not configured — upload scenes' },
  { icon: Database, t: 'Rainfall', d: 'Meteorological forcing to separate pluvial drivers from land-cover drivers.', note: 'Not configured' },
  { icon: Waypoints, t: 'DEM / terrain', d: 'Slope and flow accumulation to test runoff-concentration hypotheses.', note: 'Not configured' },
  { icon: GitBranch, t: 'Land cover', d: 'Class transitions as evidence for urban expansion or vegetation loss claims.', note: 'Not configured' },
  { icon: SearchCheck, t: 'Infrastructure', d: 'Drainage and built assets to evaluate anthropogenic explanations.', note: 'Not configured' },
];

export function ModalitiesSection() {
  return (
    <Section
      id="modalities"
      eyebrow="Multimodal Earth observation"
      title="Seven evidence families, availability stated honestly"
      description="SAATRAAI separates what it can measure today from what a deployment has not connected. Nothing below is simulated."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODALITIES.map((m) => (
          <TiltCard key={m.t} maxTilt={7} className="rounded-xl">
            <div className="h-full rounded-xl border border-line bg-card p-4 transition-colors hover:border-primary/30">
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
        ))}
      </div>
    </Section>
  );
}

/* ── 4. Reasoning ── */

const REASONING = [
  { t: 'Hypothesis-based', d: 'Candidate explanations carry assessment states: proposed, under review, supported, rejected, inconclusive.' },
  { t: 'Evidence polarity', d: 'Every evidence record is supporting, contradicting, neutral or insufficient — with the tool and version that produced it.' },
  { t: 'Explicit falsification', d: 'A hypothesis can be weakened by evidence; the interface surfaces that evidence instead of burying it.' },
  { t: 'Missing evidence', d: 'Evidence still required is listed with NOT AVAILABLE when the deployment cannot supply it.' },
];

export function ReasoningSection() {
  return (
    <Section
      id="reasoning"
      alt
      eyebrow="Hypothesis-based reasoning"
      title="An investigator that tries to disprove itself"
      description="SAATRAAI is built around assessment, not generation: claims are only as strong as the evidence records behind them."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {REASONING.map((r) => (
          <div key={r.t} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-secondary" />
              <span className="text-[13.5px] font-medium text-ink">{r.t}</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">{r.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-3xl border-l-2 border-primary/50 pl-4 text-[13px] italic leading-relaxed text-ink-dim">
        “The available evidence supports…” — never “the satellite proves…”. Correlation in imagery is reported as
        correlation; conclusions state which hypothesis is strengthened, weakened, or still untestable.
      </p>
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
      title="Every claim is a node with edges you can walk"
      description="The graph is assembled from persisted records — questions, executions, evidence, hypotheses and conclusions — so provenance is navigable, not asserted."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="flex flex-wrap gap-2">
            {GRAPH_NODES.map((n) => (
              <span
                key={n}
                className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-primary"
              >
                {n}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {GRAPH_EDGES.map((e) => (
              <span key={e} className="rounded border border-line bg-elevated px-2 py-1 font-mono text-[10.5px] text-ink-dim">
                {e}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <div className="space-y-3 text-[12.5px] leading-relaxed text-ink-dim">
            <p>
              <span className="text-ink">Question → analysis → evidence → hypothesis.</span> Each hop names the tool,
              model version, parameters and timestamps involved.
            </p>
            <p>
              Evidence produced by failed or unimplemented tool runs is still recorded — as INSUFFICIENT — so the
              absence of capability stays visible in the graph.
            </p>
            <p>
              Edges carry polarity: <span className="text-success">SUPPORTS</span>,{' '}
              <span className="text-danger">CONTRADICTS</span> or <span className="text-ink-dim">ASSOCIATED_WITH</span>.
            </p>
          </div>
          <Link href="/sign-in" className="mt-4 inline-block">
            <Button variant="secondary" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
              Open the graph
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ── 6. Temporal ── */

export function TemporalSection() {
  return (
    <Section
      alt
      eyebrow="Temporal analysis"
      title="Multi-year stacks, before / after / change"
      description="Investigations span explicit time ranges; imagery, executions and evidence are laid out on an interactive timeline that drives the map."
    >
      <div className="rounded-xl border border-line bg-card p-5">
        <div className="flex items-center gap-3">
          <CalendarRange className="h-4 w-4 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-dim">
            Preset ranges · last year / 3 years / 5 years / custom
          </span>
        </div>
        <div className="mt-5 flex items-center gap-1.5">
          {[
            { y: '2022', w: 52 },
            { y: '2023', w: 68 },
            { y: '2024', w: 84 },
            { y: '2025', w: 61 },
            { y: '2026', w: 73 },
          ].map(({ y, w }) => (
            <div key={y} className="flex-1">
              <div className="h-1.5 rounded-full bg-[#16212e]">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-dim to-primary" style={{ width: `${w}%` }} />
              </div>
              <div className="mt-1.5 text-center font-mono text-[10px] text-ink-faint">{y}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12.5px] text-ink-dim">
          Comparison modes: split view, opacity slider and swipe — driven by the selected before/after dates.
        </p>
      </div>
    </Section>
  );
}

/* ── 7. Contradiction search ── */

export function ContradictionSection() {
  return (
    <Section
      eyebrow="Contradiction search"
      title="The evidence that disagrees is the most important evidence"
      description="Contradicting observations are listed with source, date, location and strength — a hypothesis is never presented without its challengers."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { tone: 'text-success', label: 'SUPPORTING', d: 'Observations consistent with the hypothesis.' },
          { tone: 'text-danger', label: 'CONTRADICTING', d: 'Observations that weaken or falsify it.' },
          { tone: 'text-warning', label: 'INSUFFICIENT', d: 'Tool unavailable or run failed — no claim made.' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-line bg-card p-4">
            <div className={`font-mono text-[11px] tracking-[0.16em] ${item.tone}`}>{item.label}</div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-dim">{item.d}</p>
          </div>
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
      eyebrow="Uncertainty & missing evidence"
      title="Confidence with an explanation, and a list of what is still missing"
      description="Every confidence figure ships with its method and the counts behind it. Evidence still required is named — with NOT AVAILABLE where the deployment cannot provide it."
    >
      <div className="rounded-xl border border-line bg-card p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="space-y-2 text-[12.5px] leading-relaxed text-ink-dim">
            <p>
              <span className="text-ink">Evidence completeness</span> — share of records that produced an actual
              observation instead of an unavailable-tool marker.
            </p>
            <p>
              <span className="text-ink">Contradiction level</span> — decisive evidence that pushes back, shown
              alongside its sources.
            </p>
            <p>
              <span className="text-ink">Missing evidence</span> — historical drainage maps, rainfall observations,
              high-resolution imagery: listed, never fabricated.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── 9. Use cases ── */

const USE_CASES = [
  { t: 'Flood attribution', d: 'Separate rainfall-driven, land-cover-driven and drainage-driven explanations for changing flood extent.' },
  { t: 'Urban expansion audit', d: 'Test whether built-up growth explains observed surface temperature or runoff changes.' },
  { t: 'Vegetation decline', d: 'Distinguish drought stress from land management with multi-temporal evidence.' },
  { t: 'Disaster response', d: 'Rapid before/after comparison with explicit confidence and known data gaps.' },
  { t: 'Coastal morphology', d: 'Track shoreline change and challenge single-cause explanations.' },
  { t: 'Research review', d: 'Auditable evidence chains suitable for peer scrutiny and reproducibility.' },
];

export function UseCasesSection() {
  return (
    <Section
      id="use-cases"
      eyebrow="Use cases"
      title="Built for investigations, not dashboards"
      description="Each use case is a question with competing explanations — exactly what the workspace is designed to hold."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {USE_CASES.map((u) => (
          <TiltCard key={u.t} maxTilt={7} className="rounded-xl">
            <div className="h-full rounded-xl border border-line bg-card p-4 transition-colors hover:border-primary/30">
              <div className="text-[13.5px] font-medium text-ink">{u.t}</div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">{u.d}</p>
            </div>
          </TiltCard>
        ))}
      </div>
    </Section>
  );
}

/* ── 10. Technology ── */

const TECH = [
  { k: 'Frontend', v: 'Next.js · React · TypeScript · Tailwind' },
  { k: 'Map', v: 'MapLibre GL · GeoJSON · ROI drawing' },
  { k: 'API', v: 'FastAPI · JWT auth · idempotent execution' },
  { k: 'Storage', v: 'PostgreSQL / PostGIS · local object store' },
  { k: 'Orchestration', v: 'Deterministic routing · tool registry · execution traces' },
  { k: 'Models', v: 'GeoChat VQA + grounding · extensible adapters' },
];

export function TechnologySection() {
  return (
    <Section
      id="technology"
      alt
      eyebrow="Technology"
      title="A real stack, wired end to end"
      description="The web client talks to a FastAPI backend over typed endpoints: auth, projects, investigations, queries, image ingestion, executions, evidence and system status."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TECH.map((t) => (
          <div key={t.k} className="flex items-baseline justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">{t.k}</span>
            <span className="text-right text-[12.5px] text-ink-dim">{t.v}</span>
          </div>
        ))}
      </div>
      <div className="glow-edge mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <p className="text-[15px] font-medium text-ink">Ready to run your first investigation?</p>
        <p className="mx-auto mt-1.5 max-w-md text-[12.5px] text-ink-dim">
          Sign in with Google, ask a question, draw a region — the workspace assembles the evidence chain live.
        </p>
        <Link href="/sign-in" className="mt-4 inline-block">
          <Button variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
            Start investigation
          </Button>
        </Link>
      </div>
    </Section>
  );
}
