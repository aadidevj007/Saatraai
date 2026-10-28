/** Timeline construction from real investigation records (queries, images, executions, evidence). */

import type {
  EvidenceRecord,
  ExecutionTrace,
  HypothesisRecord,
  IngestedImage,
  InvestigationQuery,
} from '@/lib/api/types';

export type TimelineEventKind =
  | 'query'
  | 'image'
  | 'execution'
  | 'evidence'
  | 'hypothesis'
  | 'conclusion'
  | 'demo';

export interface TimelineEvent {
  id: string;
  date: string; // ISO
  kind: TimelineEventKind;
  title: string;
  description: string;
  /** Optional map focus. */
  coordinates?: [number, number];
  /** Optional drill-in target. */
  refType?: 'evidence' | 'execution' | 'hypothesis' | 'image';
  refId?: string;
  demo?: boolean;
}

export interface BuildTimelineInput {
  queries?: InvestigationQuery[] | null;
  images?: IngestedImage[] | null;
  executions?: ExecutionTrace[] | null;
  evidence?: EvidenceRecord[] | null;
  hypotheses?: HypothesisRecord[] | null;
}

export function buildTimeline(input: BuildTimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const q of input.queries ?? []) {
    events.push({
      id: `q-${q.id}`,
      date: q.created_at,
      kind: 'query',
      title: 'Question recorded',
      description: q.text.length > 160 ? `${q.text.slice(0, 157)}…` : q.text,
      refType: 'hypothesis',
      refId: q.id,
    });
  }

  for (const img of input.images ?? []) {
    events.push({
      id: `img-${img.id}`,
      date: img.acquisition_at ?? '',
      kind: 'image',
      title: `Scene ingested · ${String(img.modality).toUpperCase()}`,
      description: `${img.original_filename} · ${img.width ?? '?'}×${img.height ?? '?'} · ${img.crs ?? 'CRS unknown'}`,
      refType: 'image',
      refId: img.id,
    });
  }

  for (const t of input.executions ?? []) {
    if (t.started_at) {
      events.push({
        id: `run-${t.task_id}`,
        date: t.started_at,
        kind: 'execution',
        title: `Execution ${String(t.status).toUpperCase()} · ${t.selected_task}`,
        description: `${t.selected_tool}${t.model_version ? ` @ ${t.model_version}` : ''}${
          t.error ? ` — ${t.error}` : ''
        }`,
        refType: 'execution',
        refId: t.task_id,
      });
    }
  }

  for (const e of input.evidence ?? []) {
    events.push({
      id: `ev-${e.id}`,
      date: e.created_at,
      kind: 'evidence',
      title: `Evidence ${String(e.polarity).toUpperCase()}`,
      description: e.summary,
      refType: 'evidence',
      refId: e.id,
    });
  }

  for (const h of input.hypotheses ?? []) {
    events.push({
      id: `hyp-${h.id}`,
      date: h.created_at,
      kind: 'hypothesis',
      title: `Hypothesis ${String(h.assessment_state).replace('_', ' ').toUpperCase()}`,
      description: h.statement,
      refType: 'hypothesis',
      refId: h.id,
    });
  }

  const parsed = events
    .map((event) => ({ event, ts: Date.parse(event.date) }))
    .filter((entry) => Number.isFinite(entry.ts))
    .sort((a, b) => a.ts - b.ts);

  return parsed.map((entry) => entry.event);
}

/** Group timeline events by UTC year for the year rail. */
export function groupByYear(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
  const map = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    const year = event.date.slice(0, 4);
    const list = map.get(year) ?? [];
    list.push(event);
    map.set(year, list);
  }
  return map;
}
