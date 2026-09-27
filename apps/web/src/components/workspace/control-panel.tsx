'use client';

/** Left control panel: question, follow-up queries, uploads, pipeline stages, executions. */

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  Play,
  Send,
  Upload,
} from 'lucide-react';

import { Badge, Button, EmptyState, Input, Modal, NotConfiguredState } from '@/components/ui';
import { errorMessage, executionApi, imageApi, investigationApi } from '@/lib/api';
import type { ExecutionTrace, IngestedImage } from '@/lib/api/types';
import type { WorkspaceModel } from '@/lib/hooks/use-workspace-model';
import type { InvestigationConfig } from '@/lib/investigation-config';
import { useNotifications } from '@/lib/state/notifications';
import { useToast } from '@/lib/state/toast';
import { cn, formatDateTime, shortId } from '@/lib/utils';

export type StageState = 'done' | 'active' | 'waiting' | 'unavailable';

export interface PipelineStage {
  id: string;
  label: string;
  state: StageState;
  detail: string;
}

export function buildPipelineStages(
  model: WorkspaceModel,
  config: InvestigationConfig | null,
): PipelineStage[] {
  const hasQueries = model.queries.length > 0;
  const hasExecutions = model.executions.length > 0;
  const succeeded = model.executions.filter((e) => String(e.status) === 'succeeded').length;

  return [
    { id: 'query', label: 'QUERY UNDERSTANDING', state: hasQueries ? 'done' : 'waiting', detail: hasQueries ? `${model.queries.length} recorded` : 'no query recorded' },
    { id: 'region', label: 'REGION IDENTIFICATION', state: config?.region ? 'done' : 'waiting', detail: config?.region?.name ?? 'region not set on this device' },
    { id: 'temporal', label: 'TEMPORAL SCOPE', state: config ? 'done' : 'waiting', detail: config ? `${config.timeRange.start} → ${config.timeRange.end}` : 'time range unknown' },
    {
      id: 'hypothesis',
      label: 'HYPOTHESIS GENERATION',
      state: model.hypotheses.length > 0 ? 'done' : model.demo ? 'active' : 'unavailable',
      detail: model.hypotheses.length > 0 ? `${model.hypotheses.length} hypotheses` : 'planner not configured on this deployment',
    },
    { id: 'planning', label: 'EVIDENCE PLANNING', state: config ? 'done' : 'waiting', detail: config ? `${config.sources.length} source types selected` : 'configuration unknown' },
    { id: 'acquisition', label: 'DATA ACQUISITION', state: model.images.length > 0 ? 'done' : 'waiting', detail: model.images.length > 0 ? `${model.images.length} scene(s) ingested` : 'upload imagery to proceed' },
    {
      id: 'analysis',
      label: 'ANALYSIS',
      state: hasExecutions ? (succeeded > 0 ? 'done' : 'unavailable') : 'waiting',
      detail: hasExecutions ? `${succeeded}/${model.executions.length} runs succeeded` : 'no executions yet',
    },
    { id: 'contradiction', label: 'CONTRADICTION SEARCH', state: model.evidence.length > 0 ? 'done' : 'waiting', detail: model.evidence.length > 0 ? `${model.evidence.filter((e) => e.polarity === 'contradicting').length} contradicting record(s)` : 'awaiting evidence' },
    { id: 'confidence', label: 'CONFIDENCE', state: model.confidence ? 'done' : 'waiting', detail: model.confidence ? `overall ${Math.round(model.confidence.overall * 100)}%` : 'awaiting evidence' },
    { id: 'conclusion', label: 'CONCLUSION', state: model.conclusions.length > 0 ? 'done' : 'waiting', detail: model.conclusions.length > 0 ? `${model.conclusions.length} recorded` : 'no conclusion recorded' },
  ];
}

const STATE_ICON: Record<StageState, React.ComponentType<{ className?: string }>> = {
  done: CheckCircle2,
  active: Loader2,
  waiting: Circle,
  unavailable: AlertOctagon,
};

const STATE_COLOR: Record<StageState, string> = {
  done: 'text-success',
  active: 'text-primary',
  waiting: 'text-ink-faint',
  unavailable: 'text-warning',
};

export function ControlPanel({
  investigationId,
  model,
  config,
  onRunStarted,
}: {
  investigationId: string;
  model: WorkspaceModel;
  config: InvestigationConfig | null;
  onRunStarted: () => void;
}) {
  const { toast } = useToast();
  const { push } = useNotifications();
  const queryClient = useQueryClient();

  const [followUp, setFollowUp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  const stages = useMemo(() => buildPipelineStages(model, config), [model, config]);
  const question = config?.question ?? model.queries[0]?.text ?? '—';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['investigation', investigationId] });
    queryClient.invalidateQueries({ queryKey: ['investigations'] });
  };

  const submitFollowUp = async () => {
    const text = followUp.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await investigationApi.addQuery(investigationId, text);
      setFollowUp('');
      invalidate();
      toast({ variant: 'success', title: 'Query recorded', description: 'Stored server-side on your investigation.' });
    } catch (error) {
      toast({ variant: 'error', title: 'Could not record query', description: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || files.length > 2) {
      toast({ variant: 'warning', title: 'Select 1 or 2 scenes', description: 'The orchestrator accepts a single scene or a validated pair.' });
      return;
    }
    try {
      const response = await imageApi.upload(investigationId, files);
      invalidate();
      toast({
        variant: 'success',
        title: `${response.images.length} scene(s) ingested`,
        description: `Input configuration: ${response.input_configuration}`,
      });
      push({
        kind: 'info',
        title: 'Scenes ingested',
        description: `${response.images.length} image(s) added to the investigation`,
        href: `/investigations/${investigationId}`,
      });
    } catch (error) {
      toast({ variant: 'error', title: 'Upload failed', description: errorMessage(error) });
    }
  };

  const runAnalysis = async () => {
    if (selectedImages.length === 0) return;
    setRunning(true);
    try {
      const trace = await executionApi.execute(investigationId, question, selectedImages, {});
      invalidate();
      setRunOpen(false);
      onRunStarted();
      const ok = String(trace.status) === 'succeeded';
      toast(
        ok
          ? { variant: 'success', title: 'Execution succeeded', description: `${trace.selected_tool} · evidence recorded` }
          : { variant: 'warning', title: 'Execution completed without model output', description: trace.error ?? trace.status },
      );
      push({
        kind: ok ? 'investigation_completed' : 'execution_failed',
        title: ok ? 'Execution succeeded' : 'Execution produced no model output',
        description: `${trace.selected_task} via ${trace.selected_tool} — ${trace.status}`,
        href: `/investigations/${investigationId}`,
      });
    } catch (error) {
      toast({ variant: 'error', title: 'Execution failed', description: errorMessage(error) });
      push({ kind: 'execution_failed', title: 'Execution failed', description: errorMessage(error) });
    } finally {
      setRunning(false);
    }
  };

  const toggleImage = (id: string) =>
    setSelectedImages((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? [prev[1], id] : [...prev, id]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* question */}
      <div className="shrink-0 border-b border-line p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Research question</span>
          {model.demo ? <Badge tone="demo">DEMO DATA</Badge> : <Badge tone="primary">REAL</Badge>}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{question}</p>
        {config && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">
            <span>{config.region.name}</span>
            <span>{config.timeRange.start} → {config.timeRange.end}</span>
            <span>{config.strictness} · {config.depth}</span>
          </div>
        )}
        {model.demo && model.demoNote && (
          <p className="mt-2 rounded border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-2 py-1.5 text-[11px] leading-snug text-[#c4b5fd]">
            {model.demoNote}
          </p>
        )}

        {/* follow-up query */}
        <div className="mt-3 flex gap-1.5">
          <Input
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitFollowUp()}
            placeholder="Record a follow-up question…"
            aria-label="Follow-up question"
          />
          <Button size="sm" variant="secondary" loading={submitting} onClick={submitFollowUp} icon={<Send className="h-3.5 w-3.5" />}>
            Add
          </Button>
        </div>
      </div>

      {/* actions */}
      <div className="shrink-0 flex gap-2 border-b border-line p-3.5">
        <label className="flex-1">
          <input
            type="file"
            accept=".tif,.tiff,.png,.jpg,.jpeg,GeoTIFF"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void uploadFiles(files);
              e.target.value = '';
            }}
          />
          <span className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line-strong text-[12px] text-ink-dim transition-colors hover:border-primary/50 hover:text-primary">
            <Upload className="h-3.5 w-3.5" /> Attach imagery
          </span>
        </label>
        <Button
          size="sm"
          variant="primary"
          className="flex-1"
          icon={<Play className="h-3.5 w-3.5" />}
          onClick={() => setRunOpen(true)}
          disabled={model.images.length === 0}
        >
          Run analysis
        </Button>
      </div>

      {/* pipeline */}
      <div className="shrink-0 border-b border-line p-3.5">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Pipeline</div>
        <ol className="space-y-1.5">
          {stages.map((stage) => {
            const Icon = STATE_ICON[stage.state];
            return (
              <li key={stage.id} className="flex items-start gap-2" title={stage.detail}>
                <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', STATE_COLOR[stage.state], stage.state === 'active' && 'animate-spin')} />
                <div className="min-w-0">
                  <div className={cn('font-mono text-[10.5px] tracking-wider', stage.state === 'done' ? 'text-ink-dim' : stage.state === 'unavailable' ? 'text-warning' : 'text-ink-faint')}>
                    {stage.label}
                  </div>
                  <div className="truncate text-[10.5px] text-ink-faint" title={stage.detail}>
                    {stage.state === 'unavailable' ? 'NOT CONFIGURED' : stage.detail}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* executions */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Execution traces</div>
        {model.executions.length === 0 ? (
          model.unavailable.has('executions') ? (
            <NotConfiguredState title="Execution list unavailable" description="This backend does not expose execution traces." />
          ) : (
            <EmptyState
              title="No executions yet"
              description="Attach one or two scenes and run an analysis — every run records a full trace."
              action={model.images.length > 0 ? { label: 'Run analysis', onClick: () => setRunOpen(true) } : undefined}
            />
          )
        ) : (
          <ul className="space-y-2">
            {model.executions.map((trace) => (
              <TraceCard
                key={trace.task_id}
                trace={trace}
                expanded={expandedTrace === trace.task_id}
                onToggle={() => setExpandedTrace(expandedTrace === trace.task_id ? null : trace.task_id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* run modal */}
      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Run analysis"
        description="Routes through the deterministic task router and registered tool registry"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRunOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={running} disabled={selectedImages.length === 0} onClick={runAnalysis} icon={<Play className="h-3.5 w-3.5" />}>
              Execute
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Select 1 scene (single-image task) or 2 scenes (pair task) · {selectedImages.length}/2 selected
            </div>
            <ul className="space-y-1.5">
              {model.images.map((img: IngestedImage) => (
                <li key={img.id}>
                  <button
                    onClick={() => toggleImage(img.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                      selectedImages.includes(img.id) ? 'border-primary/50 bg-primary/5' : 'border-line bg-card hover:border-line-strong',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] text-ink">{img.original_filename}</span>
                      <span className="font-mono text-[10px] text-ink-faint">
                        {String(img.modality)} · {img.acquisition_at?.slice(0, 10) ?? 'no date'} · {img.width ?? '?'}×{img.height ?? '?'}
                      </span>
                    </span>
                    <span className="font-mono text-[9.5px] text-ink-faint">{shortId(img.id)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-elevated px-3 py-2.5 text-[12px] text-ink-dim">
            <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">Query routed</div>
            “{question.slice(0, 140)}
            {question.length > 140 ? '…' : ''}”
          </div>

          {model.images.length === 0 && (
            <p className="text-[12.5px] text-warning">
              No scenes ingested yet — close this dialog and use “Attach imagery” first. Providers are NOT CONFIGURED,
              so imagery must be uploaded manually.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function TraceCard({ trace, expanded, onToggle }: { trace: ExecutionTrace; expanded: boolean; onToggle: () => void }) {
  const ok = String(trace.status) === 'succeeded';
  return (
    <li className="rounded-lg border border-line bg-card">
      <button onClick={onToggle} className="flex w-full items-start gap-2 p-2.5 text-left">
        <span className={cn('mt-0.5', ok ? 'text-success' : 'text-warning')}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertOctagon className="h-3.5 w-3.5" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] text-ink">{trace.selected_task}</span>
          <span className="font-mono text-[10px] text-ink-faint">
            {trace.selected_tool} · {trace.model_version ?? '—'} · {String(trace.status)}
          </span>
        </span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-ink-faint" /> : <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />}
      </button>
      {expanded && (
        <div className="border-t border-line px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-ink-dim">
          <div>task_id · {trace.task_id}</div>
          <div>query_id · {trace.query_id}</div>
          <div>inputs · {trace.input_ids.join(', ') || '—'}</div>
          <div>params · {JSON.stringify(trace.parameters)}</div>
          <div>started · {trace.started_at ? formatDateTime(trace.started_at) : '—'}</div>
          <div>completed · {trace.completed_at ? formatDateTime(trace.completed_at) : '—'}</div>
          <div>outputs · {trace.output_references.length ? trace.output_references.join(', ') : '—'}</div>
          <div>evidence · {trace.evidence_id ?? '—'}</div>
          <div>idempotent replay · {String(trace.idempotent_replay)}</div>
          {trace.error && <div className="mt-1 text-danger">{trace.error}</div>}
        </div>
      )}
    </li>
  );
}
