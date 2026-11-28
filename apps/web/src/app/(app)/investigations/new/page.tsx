'use client';

/** Autonomous Corpus Intake — user provides the input corpus (and optional imagery); AI handles extraction & execution. */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange,
  ChevronDown,
  FileText,
  MapPin,
  Play,
  Sparkles,
  Upload,
} from 'lucide-react';

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
import { errorMessage, executionApi, imageApi, investigationApi, projectApi } from '@/lib/api';
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

const SAMPLE_CORPUS = [
  'Between June 12, 2024 and August 18, 2024, severe monsoon rainfall triggered embankment breaches along the Brahmaputra Valley near 26.2006° N, 92.9376° E and flooding across Kochi, Kerala (2024-08-05). Local civil reports note rising sediment plumes while drainage sluices remained blocked south of the main channel.',
  'Why has urban expansion accelerated in Chennai since 2019 while coastal wetlands near 13.0827° N, 80.2707° E show seasonal inundation on 2023-11-20?',
  'Across Sonoma County, California (38.2919° N, 122.4580° W), high winds on October 8, 2024 expanded ridge-top wildfire perimeters despite firebreak clearing completed in September 2024.',
];

export default function NewInvestigationPage() {
  usePageTitle('New Investigation');
  const router = useRouter();
  const { toast } = useToast();

  const [corpus, setCorpus] = useState('');
  const [attachedScenes, setAttachedScenes] = useState<File[]>([]);
  const [regionOverride, setRegionOverride] = useState<RegionSelection | null>(null);
  const [startOverride, setStartOverride] = useState('');
  const [endOverride, setEndOverride] = useState('');
  const [mode, setMode] = useState<InvestigationMode>('real');
  const [strictness, setStrictness] = useState<EvidenceStrictness>('standard');
  const [depth, setDepth] = useState<AnalysisDepth>('balanced');
  const [projectChoice, setProjectChoice] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [starting, setStarting] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [startError, setStartError] = useState<string | null>(null);
  const [previewNlp, setPreviewNlp] = useState<NlpExtractionResult | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = readSettings();
      setMode(s.defaultMode);
      setStrictness(s.defaultStrictness);
      setDepth(s.defaultDepth);
      const q = new URLSearchParams(window.location.search).get('q');
      if (q) setCorpus(q);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* Live lightweight client preview while typing (full multi-location & timestamp IE runs server-side on submit). */
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (corpus.trim().length < 8) {
        if (active) setPreviewNlp(null);
        return;
      }
      try {
        const result = await analyzePromptNlp(corpus);
        if (active) setPreviewNlp(result);
      } catch {
        // ignore transient offline preview error
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [corpus]);

  const projectsQuery = useQuery({
    queryKey: ['projects', 'investigation-create'],
    queryFn: () => projectApi.list({ page_size: 100 }),
    retry: false,
  });
  const projectsList = projectsQuery.data?.items ?? [];

  const handleCorpusFile = async (file: File) => {
    try {
      const text = await file.text();
      setCorpus((prev) => (prev.trim() ? `${prev.trim()}\n\n${text.trim()}` : text.trim()));
      toast({ variant: 'success', title: 'Corpus loaded', description: `${file.name} (${text.length.toLocaleString()} chars)` });
    } catch {
      toast({ variant: 'error', title: 'Could not read text file', description: file.name });
    }
  };

  const launchAutonomous = async () => {
    const trimmed = corpus.trim();
    if (trimmed.length < 5 || starting) return;
    setStarting(true);
    setStartError(null);
    setProgressLabel('Extracting locations, timestamps & hypotheses…');

    try {
      const result = await investigationApi.autoCreate(
        trimmed,
        projectChoice && projectChoice !== '__auto__' ? projectChoice : undefined,
      );
      const inv = result.investigation;

      // Apply explicit manual override only if user opened Manual Overrides and modified region/dates.
      if (regionOverride || (startOverride && endOverride && startOverride < endOverride)) {
        const existingCfg = inv.configuration ?? {};
        await investigationApi.updateConfiguration(inv.id, {
          ...existingCfg,
          ...(regionOverride
            ? {
                region_name: regionOverride.name,
                region_source: regionOverride.source,
                region_polygon: regionOverride.polygon.map(([lng, lat]) => [lng, lat]),
              }
            : {}),
          ...(startOverride && endOverride && startOverride < endOverride
            ? { time_start: startOverride, time_end: endOverride }
            : {}),
        });
      }

      const cfg = inv.configuration;
      saveInvestigationConfig({
        investigationId: inv.id,
        question: cfg?.question ?? inv.title,
        region: regionOverride ?? {
          name: cfg?.region_name ?? 'Extracted locations',
          source: 'preset',
          polygon: (cfg?.region_polygon ?? []) as RegionSelection['polygon'],
        },
        timeRange: {
          start: startOverride || cfg?.time_start || new Date().toISOString().slice(0, 10),
          end: endOverride || cfg?.time_end || new Date().toISOString().slice(0, 10),
        },
        sources: (cfg?.evidence_sources ?? ['optical', 'sar']) as EvidenceSourceKind[],
        evidencePlan: buildEvidencePlan(
          cfg?.question ?? inv.title,
          (cfg?.evidence_sources ?? ['optical', 'sar']) as EvidenceSourceKind[],
          {
            start: startOverride || cfg?.time_start || new Date().toISOString().slice(0, 10),
            end: endOverride || cfg?.time_end || new Date().toISOString().slice(0, 10),
          },
        ),
        extractedLocations: cfg?.extracted_locations ?? result.extraction.locations,
        extractedTimestamps: cfg?.extracted_timestamps ?? result.extraction.timestamps,
        extractedEntities: cfg?.extracted_entities ?? result.extraction.entities,
        extractorModel: result.extraction.extractor,
        mode,
        strictness,
        depth,
        createdAt: new Date().toISOString(),
      });

      // Automatically analyze attached photos/screenshots OR GeoTIFF rasters without manual selection.
      if (attachedScenes.length > 0) {
        const tiffs = attachedScenes.filter((f) => /\.tiff?$/i.test(f.name)).slice(0, 2);
        const photos = attachedScenes.filter((f) => !/\.tiff?$/i.test(f.name));

        if (photos.length > 0) {
          setProgressLabel('Analyzing attached photo(s) with AI Vision…');
          for (const photo of photos) {
            await investigationApi.analyzeImage(inv.id, photo, cfg?.question ?? inv.title);
          }
        }
        if (tiffs.length > 0) {
          setProgressLabel('Ingesting GeoTIFF scene(s) & running analysis…');
          const ingested = await imageApi.upload(inv.id, tiffs);
          const ids = ingested.images.map((img) => img.id);
          await executionApi.execute(inv.id, cfg?.question ?? inv.title, ids, {});
        }
      }

      toast({
        variant: 'success',
        title: 'Autonomous extraction complete',
        description: `${result.extraction.locations.length} location(s) · ${result.extraction.timestamps.length} timestamp(s) · ${result.extraction.hypotheses_created} hypotheses`,
      });
      router.push(`/investigations/${inv.id}`);
    } catch (error) {
      const message = errorMessage(error);
      setStartError(message);
      toast({ variant: 'error', title: 'Autonomous launch failed', description: message });
    } finally {
      setStarting(false);
      setProgressLabel('');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-font text-[28px] font-semibold tracking-tight text-ink">
            Drop your input corpus
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-dim">
            Paste text, field notes, or a report — AI automatically extracts entities, marks every location and timestamp, forms hypotheses, and builds the workspace.
          </p>
        </div>
        <Badge tone={mode === 'demo' ? 'demo' : 'primary'}>
          {mode === 'demo' ? 'Sample Demo' : 'Autonomous IE'}
        </Badge>
      </div>

      <div className="mt-6 space-y-5">
        <Panel>
          <Field label="Input text corpus / report / question" htmlFor="corpus-input">
            <Textarea
              id="corpus-input"
              value={corpus}
              onChange={(e) => setCorpus(e.target.value)}
              placeholder="Paste articles, field logs, hazard reports, coordinates, or a research question…"
              className="min-h-[180px] text-[14px] leading-relaxed"
              autoFocus
            />
          </Field>

          {previewNlp && previewNlp.hasMatches && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-elevated/70 px-3 py-2 text-[12px] text-ink-dim">
              <Sparkles className="h-3.5 w-3.5 text-ink" />
              <span>Detected preview:</span>
              {previewNlp.region && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-ink shadow-xs">
                  <MapPin className="h-3 w-3" /> {previewNlp.region.name}
                </span>
              )}
              {previewNlp.timeRange && (
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-medium text-ink shadow-xs">
                  <CalendarRange className="h-3 w-3" /> {previewNlp.timeRange.start} → {previewNlp.timeRange.end}
                </span>
              )}
            </div>
          )}

          {/* Optional file & scene attachments */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="glass-option flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-medium text-ink-dim hover:text-ink">
              <FileText className="h-4 w-4" />
              <span>Load .txt / .md corpus file</span>
              <input
                type="file"
                accept=".txt,.md,.csv,.log,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCorpusFile(file);
                  e.target.value = '';
                }}
              />
            </label>

            <label className="glass-option flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-medium text-ink-dim hover:text-ink">
              <Upload className="h-4 w-4" />
              <span>
                {attachedScenes.length > 0
                  ? `${attachedScenes.length} image(s) ready for AI`
                  : 'Optional: attach photos or GeoTIFFs'}
              </span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.tif,.tiff,image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).slice(0, 4);
                  setAttachedScenes(files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {/* Try a rich corpus sample */}
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
              Sample corpora
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_CORPUS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCorpus(sample)}
                  className="glass-option rounded-full px-3 py-1 text-left text-[11.5px] text-ink-dim hover:text-ink"
                >
                  {sample.slice(0, 74)}…
                </button>
              ))}
            </div>
          </div>

          {startError && <p className="mt-3 text-[12.5px] text-danger">{startError}</p>}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-[12px] text-ink-faint">
              {starting
                ? progressLabel
                : corpus.trim().length < 5
                  ? 'Provide text corpus above — locations, timestamps & workspace are built automatically'
                  : 'Ready · AI will extract places, timestamps, hypotheses & evidence'}
            </span>
            <Button
              variant="primary"
              size="lg"
              loading={starting}
              disabled={corpus.trim().length < 5}
              onClick={launchAutonomous}
              icon={<Play className="h-4 w-4" />}
            >
              Start AI investigation
            </Button>
          </div>
        </Panel>

        {/* Optional manual overrides (collapsed by default) */}
        <div className="rounded-2xl border border-line bg-card/70 px-5 py-3">
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="flex w-full items-center justify-between text-[12.5px] font-medium text-ink-dim hover:text-ink"
          >
            <span>Optional manual overrides (project, custom map area, dates)</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showManual ? 'rotate-180' : ''}`} />
          </button>

          {showManual && (
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Target project" htmlFor="investigation-project">
                  <select
                    id="investigation-project"
                    value={projectChoice}
                    onChange={(event) => setProjectChoice(event.target.value)}
                    className="h-9 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink"
                  >
                    <option value="">Auto-select / create workspace</option>
                    {projectsList.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Override start date" htmlFor="override-start">
                  <Input id="override-start" type="date" value={startOverride} onChange={(e) => setStartOverride(e.target.value)} />
                </Field>
                <Field label="Override end date" htmlFor="override-end">
                  <Input id="override-end" type="date" value={endOverride} onChange={(e) => setEndOverride(e.target.value)} />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-4">
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

              <RegionPicker value={regionOverride} onChange={setRegionOverride} height={300} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
