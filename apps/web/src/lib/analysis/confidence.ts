/**
 * Confidence computation — deterministic heuristics over REAL evidence records.
 * Nothing here invents measurements: every metric derives from persisted
 * evidence polarity, provenance and execution status counts.
 */

import type { EvidenceRecord, HypothesisRecord } from '@/lib/api/types';

export interface ConfidenceMetric {
  id: string;
  label: string;
  value: number; // 0..1
  explanation: string;
}

export interface ConfidenceReport {
  overall: number; // 0..1
  metrics: ConfidenceMetric[];
  counts: { supporting: number; contradicting: number; neutral: number; insufficient: number; total: number };
  method: string;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

export function computeConfidence(evidence: EvidenceRecord[]): ConfidenceReport {
  const counts = { supporting: 0, contradicting: 0, neutral: 0, insufficient: 0, total: evidence.length };
  for (const item of evidence) {
    if (item.polarity === 'supporting') counts.supporting++;
    else if (item.polarity === 'contradicting') counts.contradicting++;
    else if (item.polarity === 'neutral') counts.neutral++;
    else counts.insufficient++;
  }

  const assessed = counts.supporting + counts.contradicting + counts.neutral;
  const judged = counts.supporting + counts.contradicting;

  // Evidence completeness — share of evidence that produced an actual observation.
  const completeness = assessed === 0 ? 0 : (assessed - counts.insufficient) / assessed;

  // Support balance — supporting vs contradicting among decisive evidence.
  const supportBalance = judged === 0 ? 0 : counts.supporting / judged;

  // Contradiction level — how much of the decisive evidence pushes back.
  const contradictionLevel = judged === 0 ? 0 : counts.contradicting / judged;

  // Provenance integrity — evidence carrying structured provenance.
  const withProvenance =
    evidence.filter((e) => e.provenance && typeof e.provenance === 'object' && Object.keys(e.provenance).length > 0)
      .length / Math.max(1, counts.total);

  // Model reliability — evidence not flagged as insufficient-but-attempted.
  const modelReliability =
    counts.total === 0 ? 0 : (counts.total - counts.insufficient) / counts.total;

  // Volume factor — more independent evidence raises confidence sub-linearly.
  const volumeFactor = Math.min(1, Math.log2(1 + counts.total) / Math.log2(9)); // 1 at 8+ items

  const overall =
    counts.total === 0
      ? 0
      : round3(
          (0.3 * supportBalance +
            0.2 * completeness +
            0.15 * withProvenance +
            0.15 * modelReliability +
            0.2 * (1 - contradictionLevel)) *
            (0.55 + 0.45 * volumeFactor),
        );

  const metrics: ConfidenceMetric[] = [
    {
      id: 'support_balance',
      label: 'Support balance',
      value: round3(supportBalance),
      explanation:
        judged === 0
          ? 'No decisive (supporting or contradicting) evidence has been recorded yet.'
          : `${counts.supporting} of ${judged} decisive evidence records support the leading explanation.`,
    },
    {
      id: 'evidence_completeness',
      label: 'Evidence completeness',
      value: round3(completeness),
      explanation:
        assessed === 0
          ? 'No evidence records exist for this investigation yet.'
          : `${counts.insufficient} of ${assessed} evidence records are flagged INSUFFICIENT (tool unavailable or execution failed).`,
    },
    {
      id: 'contradiction_level',
      label: 'Contradiction level',
      value: round3(1 - contradictionLevel),
      explanation:
        judged === 0
          ? 'No contradicting evidence has been recorded — this is not the same as its absence being verified.'
          : `${counts.contradicting} of ${judged} decisive records challenge the leading explanation (shown inverted: higher is fewer contradictions).`,
    },
    {
      id: 'provenance_integrity',
      label: 'Provenance integrity',
      value: round3(withProvenance),
      explanation: 'Share of evidence records that carry structured provenance (task, tool, version).',
    },
    {
      id: 'model_reliability',
      label: 'Model output reliability',
      value: round3(modelReliability),
      explanation:
        counts.insufficient === 0
          ? 'No evidence record was produced by a failed or unimplemented tool run.'
          : `${counts.insufficient} record(s) came from failed or unimplemented tool runs.`,
    },
    {
      id: 'evidence_volume',
      label: 'Evidence volume',
      value: round3(volumeFactor),
      explanation: `${counts.total} evidence record(s); confidence scales sub-linearly with independent records.`,
    },
  ];

  return {
    overall,
    metrics,
    counts,
    method:
      'Weighted heuristic computed client-side from persisted evidence records (0.30 support balance, 0.20 completeness, 0.15 provenance, 0.15 model reliability, 0.20 inverse contradiction), damped by evidence volume. Not a statistical posterior.',
  };
}

export interface HypothesisAssessment {
  hypothesis: HypothesisRecord;
  supporting: EvidenceRecord[];
  contradicting: EvidenceRecord[];
  neutral: EvidenceRecord[];
  insufficient: EvidenceRecord[];
  displayStatus: 'SUPPORTED' | 'WEAKENED' | 'CONTRADICTED' | 'INSUFFICIENT' | 'UNDER INVESTIGATION';
  confidence: number | null;
}

export function assessHypothesis(hypothesis: HypothesisRecord): HypothesisAssessment {
  const supporting = hypothesis.evidence.filter((e) => e.polarity === 'supporting');
  const contradicting = hypothesis.evidence.filter((e) => e.polarity === 'contradicting');
  const neutral = hypothesis.evidence.filter((e) => e.polarity === 'neutral');
  const insufficient = hypothesis.evidence.filter((e) => e.polarity === 'insufficient');

  let displayStatus: HypothesisAssessment['displayStatus'] = 'UNDER INVESTIGATION';
  if (hypothesis.evidence.length === 0) displayStatus = 'UNDER INVESTIGATION';
  else if (hypothesis.assessment_state === 'rejected' || contradicting.length > supporting.length)
    displayStatus = 'CONTRADICTED';
  else if (supporting.length > 0 && contradicting.length > 0) displayStatus = 'WEAKENED';
  else if (supporting.length > 0 && supporting.length >= neutral.length + insufficient.length)
    displayStatus = 'SUPPORTED';
  else if (insufficient.length >= hypothesis.evidence.length && insufficient.length > 0)
    displayStatus = 'INSUFFICIENT';

  const decisive = supporting.length + contradicting.length;
  const confidence =
    hypothesis.confidence !== null
      ? hypothesis.confidence
      : decisive > 0
        ? round3(supporting.length / decisive)
        : null;

  return { hypothesis, supporting, contradicting, neutral, insufficient, displayStatus, confidence };
}
