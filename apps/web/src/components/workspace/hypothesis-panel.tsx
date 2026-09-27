'use client';

/** Hypothesis panel — assessment states, confidence, supporting/contradicting evidence. */

import { useMemo, useState } from 'react';
import { BrainCircuit, ChevronDown, ChevronRight } from 'lucide-react';

import { Badge, EmptyState, NotConfiguredState, ProgressBar } from '@/components/ui';
import { assessHypothesis } from '@/lib/analysis/confidence';
import type { EvidenceRecord, HypothesisRecord } from '@/lib/api/types';
import { cn, formatDate } from '@/lib/utils';

const STATUS_TONE = {
  SUPPORTED: 'success',
  WEAKENED: 'warning',
  CONTRADICTED: 'danger',
  INSUFFICIENT: 'warning',
  'UNDER INVESTIGATION': 'primary',
} as const;

export function HypothesisPanel({
  hypotheses,
  demo,
  unavailable,
  onOpenEvidence,
}: {
  hypotheses: HypothesisRecord[];
  demo: boolean;
  unavailable: Set<string>;
  onOpenEvidence: (evidence: EvidenceRecord) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const assessments = useMemo(() => hypotheses.map((h) => assessHypothesis(h)), [hypotheses]);

  if (hypotheses.length === 0) {
    if (unavailable.has('hypotheses')) {
      return (
        <NotConfiguredState
          title="Hypothesis planner is not available"
          description="This backend does not expose hypothesis records for the investigation. Nothing is simulated — switch a DEMO investigation to see the full assessment workflow."
        />
      );
    }
    return (
      <EmptyState
        icon={<BrainCircuit className="w-5 h-5" />}
        title="No hypotheses recorded yet"
        description="When a planner runs on this deployment, candidate explanations will appear here with explicit assessment states."
      />
    );
  }

  return (
    <div className="space-y-3 p-4">
      {assessments.map((assessment, index) => {
        const { hypothesis } = assessment;
        const isOpen = expanded === hypothesis.id;
        const support = assessment.supporting.length;
        const contradict = assessment.contradicting.length;
        const decisive = support + contradict;

        return (
          <article key={hypothesis.id} className="rounded-xl border border-line bg-card">
            <button
              onClick={() => setExpanded(isOpen ? null : hypothesis.id)}
              className="flex w-full items-start gap-3 p-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 font-mono text-[10.5px] font-semibold text-primary">
                H{index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[assessment.displayStatus]}>{assessment.displayStatus}</Badge>
                  {demo && <Badge tone="demo">DEMO DATA</Badge>}
                  {hypothesis.confidence !== null && (
                    <span className="font-mono text-[10.5px] text-ink-faint">
                      backend confidence {Math.round(hypothesis.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{hypothesis.statement}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
                  <span className="text-success">{support} supporting</span>
                  <span className="text-danger">{contradict} contradicting</span>
                  <span className="text-warning">{assessment.insufficient.length} insufficient</span>
                  <span className="text-ink-faint">{hypothesis.evidence.length} total</span>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    value={assessment.confidence ?? (decisive === 0 ? 0 : support / decisive)}
                    tone={assessment.displayStatus === 'CONTRADICTED' ? 'danger' : assessment.displayStatus === 'SUPPORTED' ? 'success' : 'primary'}
                    height={4}
                  />
                </div>
              </div>
              <span className="mt-1 text-ink-faint">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
            </button>

            {isOpen && (
              <div className="border-t border-line px-3.5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">Linked evidence</span>
                  <span className="font-mono text-[10px] text-ink-faint">state: {hypothesis.assessment_state}</span>
                </div>
                {hypothesis.evidence.length === 0 ? (
                  <p className="text-[12.5px] text-ink-faint">No evidence linked to this hypothesis yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {hypothesis.evidence.map((e) => (
                      <li key={e.id}>
                        <button
                          onClick={() => onOpenEvidence(e)}
                          className={cn(
                            'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                            e.polarity === 'supporting' && 'border-success/25 bg-success/5 hover:border-success/50',
                            e.polarity === 'contradicting' && 'border-danger/25 bg-danger/5 hover:border-danger/50',
                            e.polarity === 'insufficient' && 'border-warning/25 bg-warning/5 hover:border-warning/50',
                            e.polarity === 'neutral' && 'border-line hover:border-line-strong',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge tone={e.polarity === 'supporting' ? 'success' : e.polarity === 'contradicting' ? 'danger' : e.polarity === 'insufficient' ? 'warning' : 'neutral'}>
                              {e.polarity}
                            </Badge>
                            <span className="font-mono text-[9.5px] text-ink-faint">{formatDate(e.created_at)}</span>
                          </div>
                          <p className="mt-1 text-[12px] leading-snug text-ink-dim">{e.summary}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </article>
        );
      })}

      <p className="pt-1 text-[11.5px] leading-relaxed text-ink-faint">
        Statuses are derived from linked evidence polarity: SUPPORTED means supporting evidence outweighs
        contradicting evidence; CONTRADICTED means the reverse; INSUFFICIENT means no decisive observation exists.
      </p>
    </div>
  );
}
