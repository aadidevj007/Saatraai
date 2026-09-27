'use client';

/** Guided New Investigation wizard: question → region → time → sources → configure → start. */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CalendarRange, Check, Flag, Layers, Play, Sparkles, Wand2 } from 'lucide-react';

import { RegionPicker } from '@/components/map/region-picker';
import { usePageTitle } from '@/components/shell/shell-context';
import {
  Badge,
  Button,
  Field,
  Input,
  Panel,
  SectionHeader,
  Segmented,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { errorMessage, providerApi, projectApi, investigationApi } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import {
  saveInvestigationConfig,
  type AnalysisDepth,
  type EvidenceSourceKind,
  type EvidenceStrictness,
  type InvestigationMode,
  type RegionSelection,
} from '@/lib/investigation-config';
import { useToast } from '@/lib/state/toast';
import { readSettings } from '@/lib/settings';

const STEPS = [
  { id: 'question', label: 'Question', icon: Sparkles },
  { id: 'region', label: 'Region', icon: Flag },
  { id: 'time', label: 'Time range', icon: CalendarRange },
  { id: 'sources', label: 'Data sources', icon: Layers },
  { id: 'configure', label: 'Configure', icon: Wand2 },
] as const;

const SUGGESTIONS = [
  'Why has flooding increased in this region between 2022 and 2026?',
  'How has urban expansion changed since 2019?',
  'Where has vegetation declined over the last five years?',
  'What changed after the cyclone make landfall?',
  'How has coastline morphology changed between 2015 and 2025?',
];

interface SourceDef {
  id: EvidenceSourceKind;
  label: string;
  description: string;
  statusKey: string | null;
}

const SOURCES: SourceDef[] = [
  { id: 'optical', label: 'Optical', description: 'Sentinel-2 multispectral imagery', statusKey: 'satellite_optical' },
  { id: 'sar', label: 'SAR', description: 'Sentinel-1 C-band backscatter', statusKey: 'satellite_sar' },
  { id: 'rainfall', label: 'Rainfall', description: 'Meteorological precipitation records', statusKey: 'rainfall' },
  { id: 'dem', label: 'DEM', description: 'Elevation and slope derivatives', statusKey: null },
  { id: 'landcover', label: 'Land cover', description: 'Classification and transitions', statusKey: null },
  { id: 'vegetation', label: 'Vegetation', description: 'NDVI / biomass indices', statusKey: null },
  { id: 'infrastructure', label: 'Infrastructure', description: 'Drainage and built assets', statusKey: null },
];

function isoMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default function NewInvestigationPage() {
  usePageTitle('New Investigation');
  const router = useRouter();
  const { toast } = useToast();
  const { preferences } = useAuth();

  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState('');
  const [region, setRegion] = useState<RegionSelection | null>(null);
  const [start, setStart] = useState(isoMonthsAgo(36));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [sources, setSources] = useState<EvidenceSourceKind[]>(['optical', 'sar']);
  const [mode, setMode] = useState<InvestigationMode>('real');
  const [strictness, setStrictness] = useState<EvidenceStrictness>('standard');
  const [depth, setDepth] = useState<AnalysisDepth>('balanced');

  /* apply saved investigation defaults once on the client */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = readSettings();
      setMode(s.defaultMode);
      setStrictness(s.defaultStrictness);
      setDepth(s.defaultDepth);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const statusQuery = useQuery({
    queryKey: ['system-status'],
    queryFn: () => providerApi.status(),
    retry: false,
  });

  const availability = useMemo(() => {
    const map = new Map<string, { state: string; detail?: string }>();
    for (const service of statusQuery.data?.services ?? []) {
      map.set(service.id, { state: service.state, detail: service.detail });
    }
    return map;
  }, [statusQuery.data]);

  const canStart = question.trim().length >= 3 && region !== null && start < end;

  const startInvestigation = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      /* 1. ensure a project exists */
      const projects = await projectApi.list({ page_size: 100 });
      let projectId = projects.items[0]?.id;
      if (!projectId) {
        const project = await projectApi.create(
          'Field Investigations',
          'Default project for SAATRAAI Earth observation investigations',
        );
        projectId = project.id;
      }

      /* 2. create the investigation */
      const title = question.trim().length > 72 ? `${question.trim().slice(0, 69)}…` : question.trim();
      const investigation = await investigationApi.create(projectId, title);

      /* 3. persist wizard configuration locally */
      saveInvestigationConfig({
        investigationId: investigation.id,
        question: question.trim(),
        region: region!,
        timeRange: { start, end },
        sources,
        mode,
        strictness,
        depth,
        createdAt: new Date().toISOString(),
      });

      /* 4. persist the question server-side */
      await investigationApi.addQuery(investigation.id, question.trim());

      toast({
        variant: 'success',
        title: 'Investigation created',
        description: `${title.slice(0, 48)}${title.length > 48 ? '…' : ''} · ${mode === 'demo' ? 'DEMO' : 'REAL'} mode`,
      });
      router.push(`/investigations/${investigation.id}?progress=1`);
    } catch (error) {
      const message = errorMessage(error);
      setStartError(message);
      toast({ variant: 'error', title: 'Could not start investigation', description: message });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-7">
      {/* header + stepper */}
      <SectionHeader
        title="New investigation"
        description="Five steps — every value becomes real application state persisted through the API."
        action={
          <Badge tone={mode === 'demo' ? 'demo' : 'primary'}>{mode === 'demo' ? 'DEMO MODE' : 'REAL MODE'}</Badge>
        }
      />

      <ol className="mt-5 flex flex-wrap gap-2" aria-label="Wizard steps">
        {STEPS.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'pending';
          const Icon = s.icon;
          return (
            <li key={s.id}>
              <button
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] transition-colors ${
                  state === 'active'
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : state === 'done'
                      ? 'border-line bg-card text-ink-dim hover:border-line-strong'
                      : 'border-line bg-transparent text-ink-faint'
                }`}
              >
                <span className="font-mono text-[10px]">{state === 'done' ? <Check className="h-3 w-3" /> : String(i + 1).padStart(2, '0')}</span>
                {s.label}
                <Icon className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ol>

      <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-5">
        {/* ── STEP 1 · QUESTION ── */}
        {step === 0 && (
          <Panel title="What would you like to investigate?" subtitle="Natural language — the planner routes it into tasks">
            <Field label="Research question" htmlFor="question" hint="Minimum 3 characters. The exact text is persisted as your first investigation query.">
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Why has flooding increased in this region between 2022 and 2026?"
                className="min-h-[120px] text-[14px]"
                autoFocus
              />
            </Field>
            <div className="mt-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Example prompts</div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuestion(s)}
                    className="rounded-lg border border-line bg-card px-3 py-1.5 text-left text-[12px] text-ink-dim transition-colors hover:border-primary/40 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-between">
              <Button variant="ghost" onClick={() => router.push('/overview')} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Cancel
              </Button>
              <Button variant="primary" disabled={question.trim().length < 3} onClick={() => setStep(1)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                Select region
              </Button>
            </div>
          </Panel>
        )}

        {/* ── STEP 2 · REGION ── */}
        {step === 1 && (
          <Panel title="Define the region of interest" subtitle="Search a preset or coordinates, draw a polygon or rectangle, or upload GeoJSON">
            <RegionPicker value={region} onChange={setRegion} />
            <div className="mt-5 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back
              </Button>
              <Button variant="primary" disabled={!region} onClick={() => setStep(2)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                Set time range
              </Button>
            </div>
          </Panel>
        )}

        {/* ── STEP 3 · TIME ── */}
        {step === 2 && (
          <Panel title="Select the time range" subtitle="Imagery, evidence and the timeline are bounded by these dates">
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Last year', months: 12 },
                { label: 'Last 3 years', months: 36 },
                { label: 'Last 5 years', months: 60 },
              ].map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setStart(isoMonthsAgo(p.months));
                    setEnd(new Date().toISOString().slice(0, 10));
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Start date" htmlFor="start">
                <Input id="start" type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End date" htmlFor="end">
                <Input id="end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>

            <TimeSpanBar start={start} end={end} />

            <div className="mt-5 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back
              </Button>
              <Button variant="primary" disabled={start >= end} onClick={() => setStep(3)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                Choose data sources
              </Button>
            </div>
          </Panel>
        )}

        {/* ── STEP 4 · SOURCES ── */}
        {step === 3 && (
          <Panel
            title="Select evidence types"
            subtitle="Availability is read from live system status — nothing is faked"
            actions={
              statusQuery.isPending ? <Skeleton className="h-4 w-24" /> : <Badge tone={statusQuery.data ? 'primary' : 'warning'}>{statusQuery.data ? 'LIVE STATUS' : 'STATUS UNAVAILABLE'}</Badge>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {SOURCES.map((source) => {
                const selected = sources.includes(source.id);
                const info = source.statusKey
                  ? availability.get(source.statusKey)
                  : { state: 'not_configured', detail: 'No service entry on this deployment' };
                const state = info?.state ?? 'not_configured';
                return (
                  <button
                    key={source.id}
                    onClick={() =>
                      setSources((prev) => (prev.includes(source.id) ? prev.filter((s) => s !== source.id) : [...prev, source.id]))
                    }
                    aria-pressed={selected}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected ? 'border-primary/50 bg-primary/5' : 'border-line bg-card hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-ink">{source.label}</span>
                      <Badge tone={state === 'online' ? 'success' : state === 'degraded' ? 'warning' : 'warning'}>
                        {state === 'online' ? 'AVAILABLE' : state === 'degraded' ? 'DEGRADED' : 'NOT CONFIGURED'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-ink-dim">{source.description}</p>
                    {info?.detail && <p className="mt-1.5 font-mono text-[10.5px] leading-snug text-ink-faint">{info.detail}</p>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-[12px] leading-relaxed text-ink-dim">
              Unconfigured providers do not block an investigation: imagery is uploaded manually to the workspace, and
              executions route through the registered tool registry.
            </div>

            <div className="mt-5 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(4)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                Configure
              </Button>
            </div>
          </Panel>
        )}

        {/* ── STEP 5 · CONFIGURE + START ── */}
        {step === 4 && (
          <Panel title="Configure and start" subtitle="Mode, evidence strictness and analysis depth">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
                <div>
                  <div className="text-[13px] font-medium text-ink">Investigation mode</div>
                  <div className="text-[12px] text-ink-dim">
                    DEMO runs the marked demonstration workflow · REAL executes against uploaded imagery and the tool registry
                  </div>
                </div>
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'real', label: 'REAL' },
                    { value: 'demo', label: 'DEMO' },
                  ]}
                  ariaLabel="Investigation mode"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
                <div>
                  <div className="text-[13px] font-medium text-ink">Evidence strictness</div>
                  <div className="text-[12px] text-ink-dim">Recorded with the investigation configuration and shown in reports</div>
                </div>
                <Segmented
                  value={strictness}
                  onChange={setStrictness}
                  options={[
                    { value: 'standard', label: 'Standard' },
                    { value: 'strict', label: 'Strict' },
                    { value: 'research', label: 'Research' },
                  ]}
                  ariaLabel="Evidence strictness"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
                <div>
                  <div className="text-[13px] font-medium text-ink">Analysis depth</div>
                  <div className="text-[12px] text-ink-dim">Fast · Balanced · Deep — recorded in the execution context</div>
                </div>
                <Segmented
                  value={depth}
                  onChange={setDepth}
                  options={[
                    { value: 'fast', label: 'Fast' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'deep', label: 'Deep' },
                  ]}
                  ariaLabel="Analysis depth"
                />
              </div>

              {/* summary */}
              <div className="rounded-xl border border-line bg-elevated p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Summary</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink">{question || '—'}</p>
                <div className="mt-3 grid gap-x-6 gap-y-1.5 font-mono text-[11px] text-ink-dim sm:grid-cols-2">
                  <div>REGION · {region?.name ?? '—'}</div>
                  <div>PERIOD · {start} → {end}</div>
                  <div>SOURCES · {sources.length ? sources.join(', ').toUpperCase() : 'none selected'}</div>
                  <div>MODE · {mode.toUpperCase()} · {strictness.toUpperCase()} · {depth.toUpperCase()}</div>
                  <div>RESEARCH INTEREST · {preferences?.research_interest ?? 'not set'}</div>
                </div>
              </div>

              {startError && <p className="text-[12.5px] text-danger">{startError}</p>}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(3)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  loading={starting}
                  disabled={!canStart}
                  onClick={startInvestigation}
                  icon={<Play className="h-4 w-4" />}
                >
                  Start investigation
                </Button>
              </div>

              {!canStart && (
                <p className="text-right text-[12px] text-ink-faint">
                  {question.trim().length < 3
                    ? 'A question is required.'
                    : !region
                      ? 'A region of interest is required.'
                      : start >= end
                        ? 'Start date must precede end date.'
                        : ''}
                </p>
              )}
            </div>
          </Panel>
        )}
      </motion.div>
    </div>
  );
}

/** Visual bar showing the selected span against a 2015→now window. */
function TimeSpanBar({ start, end }: { start: string; end: string }) {
  const windowStart = Date.parse('2015-01-01');
  const windowEnd = Math.max(Date.parse(end) + 86_400_000, windowStart + 86_400_000);
  const s = Math.max(0, Math.min(1, (Date.parse(start) - windowStart) / (windowEnd - windowStart)));
  const e = Math.max(0, Math.min(1, (Date.parse(end) - windowStart) / (windowEnd - windowStart)));
  const days = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000));

  return (
    <div className="mt-5">
      <div className="relative h-9 rounded-lg border border-line bg-card">
        <div
          className="absolute inset-y-1 rounded-md bg-gradient-to-r from-primary-dim/70 to-primary/70"
          style={{ left: `${s * 100}%`, width: `${Math.max(1, (e - s) * 100)}%` }}
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[9.5px] text-ink-faint">2015</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9.5px] text-ink-faint">NOW</span>
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-ink-dim">
        <span>{start}</span>
        <span className="text-primary">{days.toLocaleString()} days selected</span>
        <span>{end}</span>
      </div>
    </div>
  );
}
