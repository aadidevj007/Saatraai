'use client';

/** Investigation workspace — the core application screen. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarRange,
  FileText,
  RefreshCw,
  SlidersHorizontal,
  Waypoints,
} from 'lucide-react';

import { AnalysisPanel, ConclusionPanel } from '@/components/workspace/analysis-panel';
import { ControlPanel, buildPipelineStages } from '@/components/workspace/control-panel';
import { EvidencePanel } from '@/components/workspace/evidence-panel';
import { HypothesisPanel } from '@/components/workspace/hypothesis-panel';
import { MapPanel } from '@/components/workspace/map-panel';
import { ProgressScreen } from '@/components/workspace/progress-screen';
import { TimelineRail } from '@/components/workspace/timeline-rail';
import { usePageTitle } from '@/components/shell/shell-context';
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Modal,
  Tabs,
} from '@/components/ui';
import { RegionPicker } from '@/components/map/region-picker';
import type { EvidenceRecord } from '@/lib/api/types';
import type { RegionSelection } from '@/lib/investigation-config';
import { useAuth } from '@/lib/auth/auth-context';
import { getInvestigationConfig, saveInvestigationConfig } from '@/lib/investigation-config';
import { useWorkspaceModel } from '@/lib/hooks/use-workspace-model';
import { useToast } from '@/lib/state/toast';

type RightTab = 'hypotheses' | 'evidence' | 'confidence' | 'conclusion';

export default function InvestigationWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const { preferences } = useAuth();

  const { model, bundle } = useWorkspaceModel(id);
  const { investigation, config, isLoading, refetchAll } = bundle;

  const [rightTab, setRightTab] = useState<RightTab>('hypotheses');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecord | null>(null);
  const [focusEvidence, setFocusEvidence] = useState<EvidenceRecord | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeVersion, setScopeVersion] = useState(0);

  /* scope editor local state */
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editRegion, setEditRegion] = useState<RegionSelection | null>(null);

  usePageTitle(investigation?.title ?? (isLoading ? 'Loading…' : 'Investigation'), investigation?.status);

  /* progress overlay on fresh creation */
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (window.location.search.includes('progress=1')) setShowProgress(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* open evidence drawer when picked from other panels */
  const openEvidence = useCallback((evidence: EvidenceRecord) => {
    setSelectedEvidence(evidence);
    setFocusEvidence(evidence);
    setRightTab('evidence');
  }, []);

  const flyToEvidence = useCallback((evidence: EvidenceRecord) => {
    setFocusEvidence(evidence);
  }, []);

  /* workspace-scoped shortcuts: m (map), e (evidence) */
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (detail?.key === 'e') setRightTab('evidence');
      if (detail?.key === 'm') {
        document.getElementById('workspace-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('saatraai:shortcut', handler);
    return () => window.removeEventListener('saatraai:shortcut', handler);
  }, []);

  const selectedEvent = useMemo(
    () => model.timeline.find((e) => e.id === selectedEventId) ?? null,
    [model.timeline, selectedEventId],
  );

  const stages = useMemo(() => buildPipelineStages(model, config), [model, config]);

  const openScopeEditor = () => {
    setEditStart(config?.timeRange.start ?? '');
    setEditEnd(config?.timeRange.end ?? '');
    setEditRegion(config?.region ?? null);
    setScopeOpen(true);
  };

  const saveScope = (nextRegion: RegionSelection | null) => {
    const current = getInvestigationConfig(id);
    if (!current) {
      toast({
        variant: 'warning',
        title: 'Configuration not stored on this device',
        description: 'This investigation was created elsewhere. Scope editing requires the local configuration record.',
      });
      return;
    }
    if (!nextRegion || editStart >= editEnd) {
      toast({ variant: 'warning', title: 'Invalid scope', description: 'A region and a valid time range are required.' });
      return;
    }
    saveInvestigationConfig({ ...current, region: nextRegion, timeRange: { start: editStart, end: editEnd } });
    setScopeVersion((v) => v + 1);
    setScopeOpen(false);
    toast({ variant: 'success', title: 'Scope updated', description: `${nextRegion.name} · ${editStart} → ${editEnd}` });
  };

  /* ── states ── */
  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState label="Loading investigation workspace…" rows={5} />
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="p-6">
        <ErrorState
          title="Unable to load this investigation"
          error="The investigation was not found, or it is not owned by the signed-in account."
          onRetry={refetchAll}
        />
        <div className="mt-3 flex justify-center">
          <Link href="/investigations">
            <Button variant="secondary" size="sm">Back to investigations</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-scope-version={scopeVersion}>
      {/* header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/investigations" className="text-ink-faint transition-colors hover:text-ink" aria-label="Back to investigations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[14.5px] font-medium text-ink">{investigation.title}</h1>
              <Badge tone={investigation.status === 'complete' ? 'success' : investigation.status === 'blocked' ? 'danger' : 'primary'}>
                {investigation.status}
              </Badge>
              {model.demo && <Badge tone="demo">DEMO DATA</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-3 font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">
              <span>id {investigation.id.slice(0, 8)}</span>
              <span>{model.evidence.length} evidence</span>
              <span>{model.hypotheses.length} hypotheses</span>
              <span>{model.images.length} scenes</span>
              <span>{model.executions.length} executions</span>
              {preferences?.organization && <span>{preferences.organization}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="ghost" onClick={refetchAll} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={openScopeEditor} icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
            Edit scope
          </Button>
          <Link href={`/graph?inv=${investigation.id}`}>
            <Button size="sm" variant="secondary" icon={<Waypoints className="h-3.5 w-3.5" />}>
              Graph
            </Button>
          </Link>
          <Link href={`/reports?inv=${investigation.id}`}>
            <Button size="sm" variant="secondary" icon={<FileText className="h-3.5 w-3.5" />}>
              Report
            </Button>
          </Link>
        </div>
      </header>

      {/* body */}
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        {/* LEFT */}
        <aside className="order-2 max-h-[46vh] w-full shrink-0 overflow-y-auto border-line xl:order-1 xl:max-h-none xl:w-[340px] xl:border-r">
          <ControlPanel investigationId={id} model={model} config={config} onRunStarted={refetchAll} />
        </aside>

        {/* CENTER */}
        <section id="workspace-map" className="order-1 flex min-h-[420px] min-w-0 flex-1 flex-col xl:order-2 xl:min-h-0">
          <div className="min-h-0 flex-1">
            <MapPanel
              region={config?.region ?? null}
              images={model.images}
              evidence={model.evidence}
              selectedEvent={selectedEvent}
              selectedEvidence={focusEvidence}
            />
          </div>
          <div className="h-32 shrink-0 border-t border-line bg-surface">
            <TimelineRail
              events={model.timeline}
              selectedId={selectedEventId}
              onSelect={(event) => {
                setSelectedEventId(event.id);
                if (event.refType === 'evidence' && event.refId) {
                  const match = model.evidence.find((e) => e.id === event.refId);
                  if (match) setFocusEvidence(match);
                }
              }}
              range={config?.timeRange}
            />
          </div>
        </section>

        {/* RIGHT */}
        <aside className="order-3 flex max-h-[60vh] w-full min-h-0 shrink-0 flex-col border-line xl:max-h-none xl:w-[400px] xl:border-l">
          <div className="shrink-0 px-4 pt-3">
            <Tabs
              value={rightTab}
              onChange={(id) => setRightTab(id as RightTab)}
              tabs={[
                { id: 'hypotheses', label: 'Hypotheses', count: model.hypotheses.length },
                { id: 'evidence', label: 'Evidence', count: model.evidence.length },
                { id: 'confidence', label: 'Confidence' },
                { id: 'conclusion', label: 'Conclusion', count: model.conclusions.length },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rightTab === 'hypotheses' && (
              <HypothesisPanel
                hypotheses={model.hypotheses}
                demo={model.demo}
                unavailable={model.unavailable}
                onOpenEvidence={openEvidence}
              />
            )}
            {rightTab === 'evidence' && (
              <EvidencePanel
                evidence={model.evidence}
                hypotheses={model.hypotheses}
                images={model.images}
                queries={model.queries}
                executions={model.executions}
                demo={model.demo}
                unavailable={model.unavailable}
                onFlyTo={flyToEvidence}
                selected={selectedEvidence}
                onSelect={setSelectedEvidence}
              />
            )}
            {rightTab === 'confidence' && (
              <AnalysisPanel
                confidence={model.confidence}
                evidence={model.evidence}
                hypotheses={model.hypotheses}
                missingEvidence={model.missingEvidence}
                demo={model.demo}
                unavailable={model.unavailable}
                onOpenEvidence={openEvidence}
              />
            )}
            {rightTab === 'conclusion' && (
              <ConclusionPanel conclusions={model.conclusions} confidence={model.confidence} demo={model.demo} />
            )}
          </div>
        </aside>
      </div>

      {/* progress overlay */}
      {showProgress && (
        <ProgressScreen stages={stages} demo={model.demo} onDone={() => setShowProgress(false)} />
      )}

      {/* scope editor */}
      <Modal
        open={scopeOpen}
        onClose={() => setScopeOpen(false)}
        title="Edit investigation scope"
        description="Region and time range drive the map, timeline and report"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScopeOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => saveScope(editRegion)}>
              Save scope
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <RegionPicker
            value={editRegion}
            onChange={setEditRegion}
            height={320}
          />
          <p className="text-[11.5px] text-ink-faint">
            Draw or pick a region above, adjust the dates, then press “Save scope” to persist this investigation’s
            scope on this device.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="scope-start">
              <Input id="scope-start" type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </Field>
            <Field label="End date" htmlFor="scope-end">
              <Input id="scope-end" type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
            <CalendarRange className="h-3 w-3" /> currently {config?.timeRange.start ?? '—'} → {config?.timeRange.end ?? '—'}
          </div>
        </div>
      </Modal>
    </div>
  );
}
