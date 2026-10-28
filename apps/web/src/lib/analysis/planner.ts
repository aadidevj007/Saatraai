import type { EvidenceSourceKind } from '@/lib/investigation-config';

const SOURCE_CHECKS: Record<EvidenceSourceKind, string> = {
  optical: 'Compare cloud and shadow screened optical observations across the selected period.',
  sar: 'Compare radar backscatter across acquisition dates; check orbit consistency and moisture related confounds.',
  rainfall: 'Align rainfall totals to observation windows and record the coverage and time resolution of the source.',
  dem: 'Use elevation, slope and flow direction to test whether terrain supports the observed spatial pattern.',
  landcover: 'Compare land cover transitions inside the region and record classification uncertainty.',
  vegetation: 'Compare seasonally matched vegetation index trajectories and flag crop cycles or bare soil as confounds.',
  infrastructure: 'Overlay available roads, drainage and built assets; document coverage gaps and avoid causal claims.',
};

/** Deterministic checklist only; this does not fetch data or claim observed results. */
export function buildEvidencePlan(
  question: string,
  sources: EvidenceSourceKind[],
  timeRange: { start: string; end: string },
): string[] {
  const plan = [
    `Confirm that the question “${question.trim()}” can be assessed within the selected region and ${timeRange.start} to ${timeRange.end} period.`,
    'Create a quality screened baseline; prefer comparable seasons, sensors, spatial resolution and acquisition conditions.',
    ...Array.from(new Set(sources)).map((source) => SOURCE_CHECKS[source]),
  ];
  if (new Set(sources).size > 1) {
    plan.push('Cross check apparent changes against an independent source; record disagreements and unavailable sources as evidence gaps.');
  }
  plan.push(
    'Falsification check: state an alternative explanation, its expected counter signal, and a place or period where the claim should not appear.',
    'Preserve sensor, acquisition date, processing, coverage and uncertainty with every eventual evidence record; association alone does not establish cause.',
  );
  return plan;
}
