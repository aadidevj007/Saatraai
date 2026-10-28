'use client';

/** Evidence panel — filterable evidence cards + full provenance drawer. */

import { useMemo, useState } from 'react';
import { FileSearch, Search } from 'lucide-react';

import { Badge, Drawer, EmptyState, Input, InsufficientEvidenceState, NotConfiguredState, Tabs } from '@/components/ui';
import type { EvidenceRecord, ExecutionTrace, HypothesisRecord, IngestedImage, InvestigationQuery } from '@/lib/api/types';
import { formatDateTime, shortId } from '@/lib/utils';

const POLARITY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'supporting', label: 'Supporting' },
  { id: 'contradicting', label: 'Contradicting' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'insufficient', label: 'Insufficient' },
];

const POLARITY_TONE = {
  supporting: 'success',
  contradicting: 'danger',
  neutral: 'neutral',
  insufficient: 'warning',
} as const;

export function EvidencePanel({
  evidence,
  hypotheses,
  images,
  queries,
  executions,
  demo,
  unavailable,
  onFlyTo,
  selected,
  onSelect,
}: {
  evidence: EvidenceRecord[];
  hypotheses: HypothesisRecord[];
  images: IngestedImage[];
  queries: InvestigationQuery[];
  executions: ExecutionTrace[];
  demo: boolean;
  unavailable: Set<string>;
  onFlyTo: (evidence: EvidenceRecord) => void;
  selected: EvidenceRecord | null;
  onSelect: (evidence: EvidenceRecord | null) => void;
}) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evidence.filter((e) => {
      if (tab !== 'all' && e.polarity !== tab) return false;
      if (q && !e.summary.toLowerCase().includes(q) && !JSON.stringify(e.provenance).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [evidence, tab, search]);

  if (evidence.length === 0 && unavailable.has('evidence')) {
    return (
      <NotConfiguredState
        title="Evidence endpoint unavailable"
        description="This backend does not expose evidence records for investigations, so none are shown. Nothing is fabricated in their absence."
      />
    );
  }
  if (evidence.length === 0) {
    return (
      <EmptyState
        icon={<FileSearch className="w-5 h-5" />}
        title="No evidence records yet"
        description="Run an analysis in the left panel — each tool execution persists evidence with full provenance, including failures."
      />
    );
  }

  const hypothesisById = new Map(hypotheses.map((h) => [h.id, h]));
  const imageById = new Map(images.map((i) => [i.id, i]));
  const queryById = new Map(queries.map((q) => [q.id, q]));
  const executionByEvidence = new Map(executions.filter((e) => e.evidence_id).map((e) => [e.evidence_id!, e]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-4 pt-3">
        <Tabs tabs={POLARITY_TABS} value={tab} onChange={setTab} />
        <div className="relative py-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search evidence or provenance…" className="pl-9" aria-label="Search evidence" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <InsufficientEvidenceState description="No evidence records match this filter." />
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((item) => (
              <li key={item.id} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={POLARITY_TONE[item.polarity]}>{item.polarity}</Badge>
                    <span className="font-mono text-[9.5px] text-ink-faint">{shortId(item.id)}</span>
                    {demo && <Badge tone="demo">DEMO</Badge>}
                  </div>
                  <span className="font-mono text-[9.5px] text-ink-faint">{formatDateTime(item.created_at)}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{item.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  <span>tool: {String(item.provenance?.tool_name ?? '—')}</span>
                  <span>ver: {String(item.provenance?.tool_version ?? '—')}</span>
                  {item.image_id && <span>scene: {shortId(item.image_id)}</span>}
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => onSelect(item)}
                    className="rounded-md border border-line-strong px-2 py-1 text-[11.5px] text-ink-dim transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onFlyTo(item)}
                    className="rounded-md border border-line-strong px-2 py-1 text-[11.5px] text-ink-dim transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    Map
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Drawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? `Evidence ${shortId(selected.id)}` : ''}
        subtitle={selected ? `${selected.polarity.toUpperCase()} · ${formatDateTime(selected.created_at)}` : ''}
      >
        {selected && (
          <div className="space-y-5">
            <Section title="Summary">
              <p className="text-[13px] leading-relaxed text-ink">{selected.summary}</p>
            </Section>

            <Section title="Classification">
              <div className="grid grid-cols-2 gap-2 font-mono text-[11.5px]">
                <KV k="Polarity" v={selected.polarity} />
                <KV k="Evidence ID" v={selected.id} />
                <KV k="Investigation" v={selected.investigation_id} />
                <KV k="Recorded" v={formatDateTime(selected.created_at)} />
              </div>
            </Section>

            <Section title="Related hypothesis">
              {selected.hypothesis_id ? (
                <p className="text-[12.5px] text-ink-dim">
                  {hypothesisById.get(selected.hypothesis_id)?.statement ?? selected.hypothesis_id}
                </p>
              ) : (
                <p className="text-[12.5px] text-ink-faint">Not linked to a hypothesis.</p>
              )}
            </Section>

            <Section title="Source scene">
              {selected.image_id && imageById.get(selected.image_id) ? (
                <div className="grid grid-cols-2 gap-2 font-mono text-[11.5px]">
                  <KV k="File" v={imageById.get(selected.image_id)!.original_filename} />
                  <KV k="Modality" v={String(imageById.get(selected.image_id)!.modality)} />
                  <KV k="Acquired" v={imageById.get(selected.image_id)!.acquisition_at ?? 'unknown'} />
                  <KV k="Size" v={`${imageById.get(selected.image_id)!.width ?? '?'}×${imageById.get(selected.image_id)!.height ?? '?'}`} />
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-faint">No scene attached to this record.</p>
              )}
            </Section>

            <Section title="Linked query">
              {selected.query_id && queryById.get(selected.query_id) ? (
                <p className="text-[12.5px] text-ink-dim">“{queryById.get(selected.query_id)!.text}”</p>
              ) : (
                <p className="text-[12.5px] text-ink-faint">No query attached.</p>
              )}
            </Section>

            <Section title="Execution">
              {executionByEvidence.get(selected.id) ? (
                <ExecutionFacts trace={executionByEvidence.get(selected.id)!} />
              ) : (
                <p className="text-[12.5px] text-ink-faint">No execution trace linked.</p>
              )}
            </Section>

            <Section title="Provenance">
              <pre className="overflow-x-auto rounded-lg border border-line bg-void p-3 font-mono text-[11px] leading-relaxed text-ink-dim">
                {JSON.stringify(selected.provenance, null, 2)}
              </pre>
              {selected.source_uri && (
                <p className="mt-2 break-all font-mono text-[11px] text-primary">{selected.source_uri}</p>
              )}
              {selected.source_reference && (
                <p className="mt-1 font-mono text-[11px] text-ink-faint">ref: {selected.source_reference}</p>
              )}
            </Section>

            <p className="text-[11.5px] leading-relaxed text-ink-faint">
              This record was persisted by the SAATRAAI API; the values above are read back from the database and
              were not modified by the client.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{title}</h4>
      {children}
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9.5px] uppercase tracking-wider text-ink-faint">{k}</div>
      <div className="truncate text-ink" title={v}>{v}</div>
    </div>
  );
}

function ExecutionFacts({ trace }: { trace: ExecutionTrace }) {
  return (
    <div className="grid grid-cols-2 gap-2 font-mono text-[11.5px]">
      <KV k="Task" v={trace.selected_task} />
      <KV k="Tool" v={trace.selected_tool} />
      <KV k="Model version" v={trace.model_version ?? '—'} />
      <KV k="Status" v={trace.status} />
      <KV k="Started" v={trace.started_at ? formatDateTime(trace.started_at) : '—'} />
      <KV k="Completed" v={trace.completed_at ? formatDateTime(trace.completed_at) : '—'} />
      {trace.error && (
        <div className="col-span-2 text-danger">{trace.error}</div>
      )}
    </div>
  );
}
