'use client';

/** Analysis panel: confidence metrics, contradiction search, missing evidence, charts, conclusion. */

import { useMemo } from 'react';
import { AlertTriangle, HelpCircle, SearchCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge, ConfidenceRing, EmptyState, NotConfiguredState, ProgressBar } from '@/components/ui';
import type { ConfidenceReport } from '@/lib/analysis/confidence';
import type { ConclusionRecord, EvidenceRecord, HypothesisRecord } from '@/lib/api/types';
import type { MissingEvidenceItem } from '@/lib/hooks/use-workspace-model';
import { formatDateTime, shortId } from '@/lib/utils';

const PIE_COLORS = { supporting: '#34d399', contradicting: '#f43f5e', neutral: '#93a7bc', insufficient: '#f59e0b' };

export function AnalysisPanel({
  confidence,
  evidence,
  hypotheses,
  missingEvidence,
  demo,
  unavailable,
  onOpenEvidence,
}: {
  confidence: ConfidenceReport | null;
  evidence: EvidenceRecord[];
  hypotheses: HypothesisRecord[];
  missingEvidence: MissingEvidenceItem[];
  demo: boolean;
  unavailable: Set<string>;
  onOpenEvidence: (evidence: EvidenceRecord) => void;
}) {
  const contradictions = useMemo(
    () => evidence.filter((e) => e.polarity === 'contradicting'),
    [evidence],
  );

  const pieData = useMemo(
    () =>
      [
        { name: 'supporting', value: confidence?.counts.supporting ?? 0 },
        { name: 'contradicting', value: confidence?.counts.contradicting ?? 0 },
        { name: 'neutral', value: confidence?.counts.neutral ?? 0 },
        { name: 'insufficient', value: confidence?.counts.insufficient ?? 0 },
      ].filter((d) => d.value > 0),
    [confidence],
  );

  const hypothesisBars = useMemo(
    () =>
      hypotheses
        .map((h, index) => ({
          name: `H${index + 1}`,
          value: Math.round(
            ((h.confidence !== null
              ? h.confidence
              : (() => {
                  const decisive = h.evidence.filter((e) => e.polarity === 'supporting' || e.polarity === 'contradicting');
                  const sup = decisive.filter((e) => e.polarity === 'supporting').length;
                  return decisive.length ? sup / decisive.length : 0;
                })()) ?? 0) * 100,
        ),
        }))
        .filter((b) => b.value > 0),
    [hypotheses],
  );

  if (!confidence) {
    return (
      <div className="p-4">
        {unavailable.has('evidence') ? (
          <NotConfiguredState
            title="Evidence records unavailable"
            description="Confidence metrics are computed from persisted evidence records; this deployment does not expose them."
          />
        ) : (
          <EmptyState
            icon={<HelpCircle className="w-5 h-5" />}
            title="No evidence to assess yet"
            description="Confidence, contradictions and completeness are computed from evidence records. Run an analysis to produce them."
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* confidence head */}
      <section className="rounded-xl border border-line bg-card p-4">
        <div className="flex items-center gap-5">
          <ConfidenceRing value={confidence.overall} size={104} label="Overall confidence" />
          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
              <span className="text-success">{confidence.counts.supporting} supporting</span>
              <span className="text-danger">{confidence.counts.contradicting} contradicting</span>
              <span className="text-ink-dim">{confidence.counts.neutral} neutral</span>
              <span className="text-warning">{confidence.counts.insufficient} insufficient</span>
            </div>
            {demo && <div className="mt-2"><Badge tone="demo">DEMO DATA</Badge></div>}
          </div>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">{confidence.method}</p>
      </section>

      {/* metrics */}
      <section>
        <h4 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Confidence metrics</h4>
        <div className="space-y-3">
          {confidence.metrics.map((metric) => (
            <div key={metric.id} className="rounded-lg border border-line bg-card px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-ink">{metric.label}</span>
                <span className="font-mono text-[12px] text-primary">{Math.round(metric.value * 100)}%</span>
              </div>
              <div className="mt-1.5">
                <ProgressBar value={metric.value} height={4} tone={metric.value >= 0.6 ? 'success' : metric.value >= 0.3 ? 'primary' : 'warning'} />
              </div>
              <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{metric.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* charts */}
      <section>
        <h4 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Evidence distribution {demo && <span className="text-[#c4b5fd]">· DEMO DATA</span>}
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-card p-3">
            <div className="mb-1 text-[11.5px] text-ink-dim">Polarity split</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{ background: '#0f1924', border: '1px solid #1f2e40', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#e6f1fa' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9.5px] uppercase">
              {pieData.map((d) => (
                <span key={d.name} style={{ color: PIE_COLORS[d.name as keyof typeof PIE_COLORS] }}>
                  {d.name} {d.value}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-card p-3">
            <div className="mb-1 text-[11.5px] text-ink-dim">Hypothesis support (%)</div>
            <div className="h-40">
              {hypothesisBars.length === 0 ? (
                <p className="flex h-full items-center justify-center text-[11.5px] text-ink-faint">No decisive evidence yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hypothesisBars} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#16212e" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#5d7086', fontSize: 10 }} axisLine={{ stroke: '#1f2e40' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#5d7086', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <ReTooltip
                      contentStyle={{ background: '#0f1924', border: '1px solid #1f2e40', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#e6f1fa' }}
                    />
                    <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* contradictions */}
      <section>
        <h4 className="mb-2.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-danger">
          <AlertTriangle className="h-3 w-3" /> Evidence that challenges the leading explanation
        </h4>
        {contradictions.length === 0 ? (
          <p className="rounded-lg border border-line bg-card px-3.5 py-3 text-[12.5px] text-ink-faint">
            No contradicting evidence recorded — this means none has been produced yet, not that it does not exist.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {contradictions.map((item) => {
              const hypothesis = item.hypothesis_id ? hypotheses.find((h) => h.id === item.hypothesis_id) : null;
              return (
                <li key={item.id} className="rounded-lg border border-danger/25 bg-danger/5 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="danger">CONTRADICTING</Badge>
                    <span className="font-mono text-[9.5px] text-ink-faint">{formatDateTime(item.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{item.summary}</p>
                  {hypothesis && (
                    <p className="mt-1.5 text-[11.5px] text-ink-dim">
                      Challenges: <span className="text-ink">{hypothesis.statement}</span>
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      source: {String(item.provenance?.tool_name ?? '—')}
                    </span>
                    <button
                      onClick={() => onOpenEvidence(item)}
                      className="rounded border border-line-strong px-2 py-0.5 text-[11px] text-ink-dim hover:border-danger/50 hover:text-danger"
                    >
                      Inspect
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* missing evidence */}
      <section>
        <h4 className="mb-2.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
          <SearchCheck className="h-3 w-3" /> Evidence still required
        </h4>
        {missingEvidence.length === 0 ? (
          <p className="rounded-lg border border-line bg-card px-3.5 py-3 text-[12.5px] text-ink-faint">
            No missing-evidence items derived from current records.
          </p>
        ) : (
          <ul className="space-y-2">
            {missingEvidence.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-warning/25 bg-warning/5 px-3.5 py-2.5">
                <div>
                  <div className="text-[12.5px] font-medium text-ink">{item.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-dim">{item.reason}</div>
                </div>
                <Badge tone="warning">{item.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function ConclusionPanel({
  conclusions,
  confidence,
  demo,
}: {
  conclusions: ConclusionRecord[];
  confidence: ConfidenceReport | null;
  demo: boolean;
}) {
  if (conclusions.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No conclusion recorded"
          description="Conclusions are written by the backend when an investigation produces assessed results. Nothing is drafted client-side."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {conclusions.map((conclusion) => {
        const hypothesis = conclusion.hypothesis_id;
        return (
          <article key={conclusion.id} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={conclusion.state === 'final' ? 'success' : conclusion.state === 'inconclusive' ? 'warning' : 'neutral'}>
                {conclusion.state}
              </Badge>
              {demo && <Badge tone="demo">DEMO DATA</Badge>}
              <span className="font-mono text-[9.5px] text-ink-faint">{formatDateTime(conclusion.created_at)}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink">{conclusion.summary}</p>
            {conclusion.confidence !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-ink-dim">
                  <span>conclusion confidence</span>
                  <span className="font-mono text-primary">{Math.round(conclusion.confidence * 100)}%</span>
                </div>
                <ProgressBar value={conclusion.confidence} height={4} />
              </div>
            )}
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              hypothesis: {hypothesis ? shortId(hypothesis) : 'unlinked'}
              {confidence && ` · overall ${Math.round(confidence.overall * 100)}%`}
            </div>
            {conclusion.rationale && (
              <pre className="mt-2 overflow-x-auto rounded border border-line bg-void p-2 font-mono text-[10.5px] text-ink-dim">
                {JSON.stringify(conclusion.rationale, null, 2)}
              </pre>
            )}
          </article>
        );
      })}
      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Conclusions state what the available evidence supports or weakens. They never assert proof from correlation.
      </p>
    </div>
  );
}
