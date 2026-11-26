'use client';

/** Interactive New Investigation Studio — live question, map region, dates, and launch in one view. */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, ChevronDown, Layers, MapPin, Play, Sparkles } from 'lucide-react';

import { RegionPicker } from '@/components/map/region-picker';
import { usePageTitle } from '@/components/shell/shell-context';
import {
  Badge,
  Button,
  Field,
  Input,
  Panel,
  Segmented,
  Textarea,
} from '@/components/ui';
import { errorMessage, providerApi, projectApi, investigationApi } from '@/lib/api';
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
import { buildEvidencePlan } from '@/lib/analysis/planner';
import { analyzePromptNlp, type NlpExtractionResult } from '@/lib/analysis/nlp-extractor';

const SUGGESTIONS = [
  'Why has flooding increased in Kerala between 2022 and 2026?',
  'How has urban expansion changed in Chennai since 2019?',
  'Where has vegetation declined in Horn of Africa over the last five years?',
  'What changed across Sundarbans after the cyclone made landfall?',
];

const SOURCES: Array<{ id: EvidenceSourceKind; label: string; statusKey: string }> = [
  { id: 'optical', label: 'Optical', statusKey: 'satellite_optical' },
  { id: 'sar', label: 'SAR radar', statusKey: 'satellite_sar' },
  { id: 'rainfall', label: 'Rainfall', statusKey: 'rainfall' },
  { id: 'dem', label: 'Terrain', statusKey: 'dem' },
  { id: 'landcover', label: 'Land cover', statusKey: 'landcover' },
  { id: 'vegetation', label: 'Vegetation', statusKey: 'vegetation' },
  { id: 'infrastructure', label: 'Infrastructure', statusKey: 'infrastructure' },
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

  const [question, setQuestion] = useState('');
  const [region, setRegion] = useState<RegionSelection | null>(null);
  const [start, setStart] = useState(isoMonthsAgo(36));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [sources, setSources] = useState<EvidenceSourceKind[]>(['optical', 'sar']);
  const [mode, setMode] = useState<InvestigationMode>('real');
  const [strictness, setStrictness] = useState<EvidenceStrictness>('standard');
  const [depth, setDepth] = useState<AnalysisDepth>('balanced');
  const [projectChoice, setProjectChoice] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [nlpResult, setNlpResult] = useState<NlpExtractionResult | null>(null);

  /* Read optional ?q= from Dashboard + saved defaults */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = readSettings();
      setMode(s.defaultMode);
      setStrictness(s.defaultStrictness);
      setDepth(s.defaultDepth);
      const q = new URLSearchParams(window.location.search).get('q');
      if (q) setQuestion(q);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* Smart auto-fill region & dates as user types */
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (question.trim().length < 5) {
        if (active) setNlpResult(null);
        return;
      }
      try {
        const result = await analyzePromptNlp(question);
        if (!active) return;
        setNlpResult(result);
        if (result.hasMatches) {
          if (result.timeRange && result.timeRange.confidence >= 0.8) {
            setStart(result.timeRange.start);
            setEnd(result.timeRange.end);
          }
          if (result.region && result.region.confidence >= 0.8) {
            setRegion({
              name: result.region.name,
              source: result.region.source,
              polygon: result.region.polygon,
            });
          }
          if (result.suggestedSources.length > 0) {
            setSources(result.suggestedSources);
          }
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [question]);

  const statusQuery = useQuery({
    queryKey: ['system-status'],
    queryFn: () => providerApi.status(),
    retry: false,
  });
  const projectsQuery = useQuery({
    queryKey: ['projects', 'investigation-create'],
    queryFn: () => projectApi.list({ page_size: 100 }),
    retry: false,
  });

  const projectsList = projectsQuery.data?.items ?? [];
  const effectiveProjectChoice = projectChoice || (projectsList.length > 0 ? projectsList[0].id : '__new__');
  const effectiveNewProjectName = newProjectName.trim() || 'My Research Workspace';

  const availability = useMemo(() => {
    const map = new Map<string, string>();
    for (const service of statusQuery.data?.services ?? []) {
      map.set(service.id, service.state);
    }
    return map;
  }, [statusQuery.data]);

  const canStart =
    question.trim().length >= 3 &&
    region !== null &&
    start < end &&
    !projectsQuery.isPending &&
    !projectsQuery.isError &&
    (effectiveProjectChoice !== '__new__' ? effectiveProjectChoice.length > 0 : effectiveNewProjectName.length > 0);

  const evidencePlan = useMemo(
    () => buildEvidencePlan(question || 'Research question', sources, { start, end }),
    [question, sources, start, end],
  );

  const startInvestigation = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const projectId =
        effectiveProjectChoice === '__new__'
          ? (await projectApi.create(effectiveNewProjectName)).id
          : effectiveProjectChoice;
      if (!projectId) throw new Error('Choose a project first.');

      const title = question.trim().length > 72 ? `${question.trim().slice(0, 69)}…` : question.trim();
      const investigation = await investigationApi.create(projectId, title, {
        region_name: region!.name,
        region_source: region!.source,
        region_polygon: region!.polygon.map(([lng, lat]) => [lng, lat]),
        time_start: start,
        time_end: end,
        evidence_sources: sources,
        evidence_plan: evidencePlan,
        question: question.trim(),
      });

      saveInvestigationConfig({
        investigationId: investigation.id,
        question: question.trim(),
        region: region!,
        timeRange: { start, end },
        sources,
        evidencePlan,
        mode,
        strictness,
        depth,
        createdAt: new Date().toISOString(),
      });

      await investigationApi.addQuery(investigation.id, question.trim());

      toast({
        variant: 'success',
        title: 'Investigation ready',
        description: title,
      });
      router.push(`/investigations/${investigation.id}`);
    } catch (error) {
      const message = errorMessage(error);
      setStartError(message);
      toast({ variant: 'error', title: 'Couldn’t create investigation', description: message });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-font text-[26px] font-semibold tracking-tight text-ink">
            Start a new investigation
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-dim">
            Ask your question, highlight the area on the map, and pick a timeframe.
          </p>
        </div>
        <Badge tone={mode === 'demo' ? 'demo' : 'primary'}>
          {mode === 'demo' ? 'Sample Demo' : 'Live Workspace'}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr] items-start">
        {/* Left: Question, Dates, Data Layers, Launch */}
        <div className="space-y-5">
          <Panel title="1 · Question">
            <Field label="Research question" htmlFor="question">
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Why has flooding increased in Kerala between 2022 and 2026?"
                className="min-h-[96px] text-[14px]"
                autoFocus
              />
            </Field>

            {nlpResult && nlpResult.hasMatches && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-elevated/70 px-3 py-2 text-[12px] text-ink-dim">
                <Sparkles className="h-3.5 w-3.5 text-ink" />
                <span>Auto-selected:</span>
                {nlpResult.region && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-ink shadow-xs">
                    <MapPin className="h-3 w-3" /> {nlpResult.region.name}
                  </span>
                )}
                {nlpResult.timeRange && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-ink shadow-xs">
                    <CalendarRange className="h-3 w-3" /> {nlpResult.timeRange.start} → {nlpResult.timeRange.end}
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuestion(s)}
                  className="glass-option rounded-full px-3 py-1 text-left text-[11.5px] text-ink-dim hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="2 · Timeframe & Data">
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

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Start date" htmlFor="start">
                <Input id="start" type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End date" htmlFor="end">
                <Input id="end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                <Layers className="h-3.5 w-3.5" /> Data layers
              </div>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((source) => {
                  const selected = sources.includes(source.id);
                  const state = availability.get(source.statusKey);
                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() =>
                        setSources((prev) =>
                          prev.includes(source.id) ? prev.filter((s) => s !== source.id) : [...prev, source.id],
                        )
                      }
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12.5px] font-medium active:scale-[0.97] ${
                        selected ? 'glass-option-active text-white' : 'glass-option text-ink-dim hover:text-ink'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          state === 'online' ? 'bg-success' : selected ? 'bg-white/70' : 'bg-ink-faint'
                        }`}
                      />
                      {source.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Project + Optional Settings */}
          <Panel>
            <Field label="Project" htmlFor="investigation-project">
              {projectsQuery.isPending ? (
                <p role="status" className="text-sm text-ink-dim">Loading projects…</p>
              ) : projectsQuery.isError ? (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-danger">
                    Couldn’t load projects: {errorMessage(projectsQuery.error)}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => void projectsQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <select
                    id="investigation-project"
                    value={effectiveProjectChoice}
                    onChange={(event) => setProjectChoice(event.target.value)}
                    className="h-9 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <option value="">Select a project…</option>
                    {projectsList.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                    <option value="__new__">+ Create a new project</option>
                  </select>
                  {effectiveProjectChoice === '__new__' && (
                    <div className="mt-3">
                      <Field label="New project name" htmlFor="new-project-name">
                        <Input
                          id="new-project-name"
                          value={newProjectName}
                          onChange={(event) => setNewProjectName(event.target.value)}
                          placeholder="e.g. Coastal Flood Study"
                        />
                      </Field>
                    </div>
                  )}
                </>
              )}
            </Field>

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-dim hover:text-ink"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              More options
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12.5px] text-ink-dim">Mode</span>
                  <Segmented
                    size="sm"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: 'real', label: 'Live' },
                      { value: 'demo', label: 'Sample Demo' },
                    ]}
                    ariaLabel="Investigation mode"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12.5px] text-ink-dim">Strictness</span>
                  <Segmented
                    size="sm"
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12.5px] text-ink-dim">Depth</span>
                  <Segmented
                    size="sm"
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
              </div>
            )}

            {startError && <p className="mt-3 text-[12.5px] text-danger">{startError}</p>}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-[12px] text-ink-faint">
                {question.trim().length < 3
                  ? 'Write a question to continue'
                  : !region
                    ? 'Pick or draw a region on the map'
                    : start >= end
                      ? 'Start date must be before end date'
                      : `Ready · ${region.name}`}
              </span>
              <Button
                variant="primary"
                size="lg"
                loading={starting}
                disabled={!canStart}
                onClick={startInvestigation}
                icon={<Play className="h-4 w-4" />}
              >
                Create investigation
              </Button>
            </div>
          </Panel>
        </div>

        {/* Right: Live Interactive Map */}
        <div className="lg:sticky lg:top-6">
          <Panel
            title="3 · Region on map"
            subtitle={region ? `${region.name} selected` : 'Search a place, choose a preset, or draw a shape'}
          >
            <RegionPicker value={region} onChange={setRegion} height={470} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
