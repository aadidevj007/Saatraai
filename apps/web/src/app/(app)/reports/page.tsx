'use client';

/** Reports: assemble a report document from real records and export it. */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Braces,
  FileJson,
  FileText,
  Printer,
  Table2,
  Waypoints,
} from 'lucide-react';

import { usePageTitle } from '@/components/shell/shell-context';
import { Badge, Button, EmptyState, LoadingState, Select } from '@/components/ui';
import { reportApi } from '@/lib/api';
import { assessHypothesis } from '@/lib/analysis/confidence';
import { useInvestigations } from '@/lib/hooks/queries';
import { useWorkspaceModel } from '@/lib/hooks/use-workspace-model';
import { formatDateTime, formatNumber, polygonAreaKm2, centroid, formatCoord } from '@/lib/utils';

export default function ReportsPage() {
  usePageTitle('Reports');

  const investigationsQuery = useInvestigations({ page: 1, page_size: 50 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const inv = new URLSearchParams(window.location.search).get('inv');
      if (inv) setSelectedId(inv);
      else if (investigationsQuery.data?.items.length && !selectedId) {
        setSelectedId(investigationsQuery.data.items[0].id);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [investigationsQuery.data, selectedId]);

  const { model, bundle } = useWorkspaceModel(selectedId ?? undefined);

  const doc = useMemo(() => {
    if (!bundle.investigation) return null;
    return reportApi.build({
      investigation: bundle.investigation,
      config: bundle.config,
      queries: model.queries,
      images: model.images,
      executions: model.executions,
      evidence: model.evidence,
      hypotheses: model.hypotheses,
      conclusions: model.conclusions,
      timeline: model.timeline,
      confidence: model.confidence,
    });
  }, [bundle, model]);

  const investigations = investigationsQuery.data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
            <FileText className="h-5 w-5 text-primary" /> Reports
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Reports are assembled from persisted records with full provenance — then exported as PDF, JSON, CSV or GeoJSON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            aria-label="Select investigation"
            className="w-72"
          >
            <option value="">Select investigation…</option>
            {investigations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.title}
              </option>
            ))}
          </Select>
          {selectedId && (
            <Link href={`/investigations/${selectedId}`}>
              <Button variant="secondary" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                Workspace
              </Button>
            </Link>
          )}
        </div>
      </div>

      {!selectedId ? (
        <div className="mt-6">
          <EmptyState
            title="Select an investigation"
            description="Choose an investigation above to assemble its report."
          />
        </div>
      ) : bundle.isLoading || investigationsQuery.isPending ? (
        <div className="mt-6"><LoadingState label="Assembling report…" rows={4} /></div>
      ) : !doc ? (
        <div className="mt-6">
          <EmptyState
            title="Investigation unavailable"
            description="The selected investigation could not be loaded."
            action={{ label: 'Retry', onClick: () => bundle.refetchAll() }}
          />
        </div>
      ) : (
        <>
          {/* actions */}
          <div className="no-print mt-5 flex flex-wrap gap-2">
            <Button variant="primary" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => reportApi.print()}>
              Print / Save as PDF
            </Button>
            <Button variant="secondary" icon={<FileJson className="h-3.5 w-3.5" />} onClick={() => reportApi.exportJson(doc)}>
              Export JSON
            </Button>
            <Button variant="secondary" icon={<Table2 className="h-3.5 w-3.5" />} onClick={() => reportApi.exportCsv(doc)}>
              Export evidence CSV
            </Button>
            <Button variant="secondary" icon={<Braces className="h-3.5 w-3.5" />} onClick={() => reportApi.exportGeoJson(doc)}>
              Export region GeoJSON
            </Button>
            <span className="ml-auto self-center font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              generated {formatDateTime(doc.generated_at)}
            </span>
          </div>

          {/* report document */}
          <article className="mt-5 rounded-xl border border-line bg-surface p-6 print:border-0 print:bg-white print:text-black">
            <header className="border-b border-line pb-4 print:border-black/20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-primary print:text-black/60">SAATRAAI investigation report</span>
                {model.demo && <Badge tone="demo">DEMO DATA</Badge>}
                <Badge tone="neutral">{doc.provenance.investigation.status}</Badge>
              </div>
              <h2 className="mt-2 text-[21px] font-semibold text-ink print:text-black">{doc.title}</h2>
              <div className="mt-2 grid gap-x-6 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint print:text-black/60 sm:grid-cols-2">
                <span>investigation id · {doc.provenance.investigation.id}</span>
                <span>generated · {formatDateTime(doc.generated_at)}</span>
                <span>generator · {doc.generator}</span>
                <span>api · {doc.provenance.api_base}</span>
              </div>
            </header>

            <ReportSection title="1 · Question">
              <p className="text-[13.5px] leading-relaxed text-ink print:text-black">{doc.question ?? 'No question recorded.'}</p>
            </ReportSection>

            <ReportSection title="2 · Region & time period">
              {doc.region ? (
                <div className="grid gap-x-6 gap-y-1 font-mono text-[11.5px] text-ink-dim print:text-black/70 sm:grid-cols-2">
                  <span>region · {doc.region.name}</span>
                  <span>source · {doc.region.source}</span>
                  <span>centroid · {formatCoord(centroid(doc.region.polygon))}</span>
                  <span>area · {formatNumber(polygonAreaKm2(doc.region.polygon), 1)} km²</span>
                  <span>bbox · {doc.region.polygon.length} vertices</span>
                  <span>period · {doc.time_range ? `${doc.time_range.start} → ${doc.time_range.end}` : '—'}</span>
                </div>
              ) : (
                <p className="text-[13px] text-ink-faint">No stored scope configuration for this report.</p>
              )}
            </ReportSection>

            <ReportSection title={`3 · Hypotheses (${doc.hypotheses.length})`}>
              {doc.hypotheses.length === 0 ? (
                <p className="text-[13px] text-ink-faint">No hypothesis records — planner not configured on this deployment.</p>
              ) : (
                <ol className="space-y-2">
                  {doc.hypotheses.map((h, i) => {
                    const assessment = assessHypothesis(h);
                    return (
                      <li key={h.id} className="rounded-lg border border-line bg-card p-3 print:border-black/15">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-primary print:text-black/70">H{i + 1}</span>
                          <Badge tone={assessment.displayStatus === 'SUPPORTED' ? 'success' : assessment.displayStatus === 'CONTRADICTED' ? 'danger' : assessment.displayStatus === 'INSUFFICIENT' ? 'warning' : 'neutral'}>
                            {assessment.displayStatus}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink print:text-black">{h.statement}</p>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                          {assessment.supporting.length} supporting · {assessment.contradicting.length} contradicting ·{' '}
                          {assessment.insufficient.length} insufficient
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </ReportSection>

            <ReportSection title={`4 · Evidence (${doc.evidence.length})`}>
              {doc.evidence.length === 0 ? (
                <p className="text-[13px] text-ink-faint">No evidence records.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-line font-mono text-[9.5px] uppercase tracking-wider text-ink-faint print:border-black/20">
                        <th className="py-1.5 pr-3">Polarity</th>
                        <th className="py-1.5 pr-3">Summary</th>
                        <th className="py-1.5 pr-3">Tool</th>
                        <th className="py-1.5">Recorded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.evidence.map((e) => (
                        <tr key={e.id} className="border-b border-line/60 align-top print:border-black/10">
                          <td className="py-1.5 pr-3 font-mono text-[11px]">{e.polarity}</td>
                          <td className="py-1.5 pr-3 text-ink print:text-black">{e.summary}</td>
                          <td className="py-1.5 pr-3 font-mono text-[10.5px] text-ink-faint">
                            {String(e.provenance?.tool_name ?? '—')}@{String(e.provenance?.tool_version ?? '—')}
                          </td>
                          <td className="py-1.5 font-mono text-[10.5px] text-ink-faint">{formatDateTime(e.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>

            <ReportSection title={`5 · Contradictions (${doc.evidence.filter((e) => e.polarity === 'contradicting').length})`}>
              {doc.evidence.filter((e) => e.polarity === 'contradicting').length === 0 ? (
                <p className="text-[13px] text-ink-faint">
                  No contradicting evidence recorded — absence of contradiction is not evidence of absence.
                </p>
              ) : (
                <ul className="space-y-2">
                  {doc.evidence
                    .filter((e) => e.polarity === 'contradicting')
                    .map((e) => (
                      <li key={e.id} className="rounded-lg border border-danger/25 bg-danger/5 p-3 print:border-black/20 print:bg-transparent">
                        <p className="text-[12.5px] leading-relaxed text-ink print:text-black">{e.summary}</p>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                          {String(e.provenance?.tool_name ?? '—')} · {formatDateTime(e.created_at)}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </ReportSection>

            <ReportSection title="6 · Missing evidence">
              <ul className="space-y-1.5">
                {model.missingEvidence.length === 0 ? (
                  <li className="text-[13px] text-ink-faint">No missing-evidence items derived from current records.</li>
                ) : (
                  model.missingEvidence.map((m) => (
                    <li key={m.id} className="flex items-start justify-between gap-3 text-[12.5px]">
                      <span className="text-ink print:text-black">{m.label} — <span className="text-ink-faint">{m.reason}</span></span>
                      <span className="shrink-0 font-mono text-[10px] uppercase text-warning">{m.status}</span>
                    </li>
                  ))
                )}
              </ul>
            </ReportSection>

            <ReportSection title="7 · Confidence">
              {doc.confidence ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[26px] font-semibold text-primary print:text-black">
                      {Math.round(doc.confidence.overall * 100)}%
                    </span>
                    <span className="text-[12.5px] text-ink-dim">overall (heuristic over {doc.confidence.counts.total} evidence records)</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-[12.5px] text-ink-dim print:text-black/70">
                    {doc.confidence.metrics.map((m) => (
                      <li key={m.id}>
                        <span className="font-mono text-[11px] text-ink print:text-black">{m.label}</span> · {Math.round(m.value * 100)}% — {m.explanation}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11.5px] text-ink-faint">{doc.confidence.method}</p>
                </div>
              ) : (
                <p className="text-[13px] text-ink-faint">No evidence records → no confidence computation.</p>
              )}
            </ReportSection>

            <ReportSection title={`8 · Conclusion (${doc.conclusions.length})`}>
              {doc.conclusions.length === 0 ? (
                <p className="text-[13px] text-ink-faint">No conclusion recorded by the backend.</p>
              ) : (
                <ul className="space-y-3">
                  {doc.conclusions.map((c) => (
                    <li key={c.id} className="rounded-lg border border-line bg-card p-3 print:border-black/15">
                      <div className="flex items-center gap-2">
                        <Badge tone={c.state === 'final' ? 'success' : c.state === 'inconclusive' ? 'warning' : 'neutral'}>{c.state}</Badge>
                        {c.confidence !== null && (
                          <span className="font-mono text-[10.5px] text-primary print:text-black/70">{Math.round(c.confidence * 100)}%</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink print:text-black">{c.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </ReportSection>

            <ReportSection title="9 · Limitations">
              <ul className="list-inside list-disc space-y-1 text-[12.5px] text-ink-dim print:text-black/70">
                {doc.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </ReportSection>

            <ReportSection title="10 · Sources">
              {doc.sources.length === 0 ? (
                <p className="text-[13px] text-ink-faint">No sources recorded.</p>
              ) : (
                <ul className="space-y-1 font-mono text-[11px] text-ink-dim print:text-black/70">
                  {doc.sources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
            </ReportSection>

            <footer className="mt-6 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint print:border-black/20 print:text-black/50">
              record counts · {Object.entries(doc.provenance.record_counts).map(([k, v]) => `${k}=${v}`).join(' · ')}
              {model.demo && ' · ALL SIMULATED RECORDS MARKED DEMO'}
              <div className="mt-1 flex items-center gap-1.5">
                <Waypoints className="h-3 w-3" />
                <Link href={`/graph?inv=${doc.provenance.investigation.id}`} className="underline">
                  open evidence graph
                </Link>
              </div>
            </footer>
          </article>
        </>
      )}
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-dim print:text-black/70">{title}</h3>
      {children}
    </section>
  );
}
