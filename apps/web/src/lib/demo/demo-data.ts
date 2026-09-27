/**
 * DEMO investigation dataset.
 *
 * Every record produced here is SIMULATED and must be rendered with a
 * "DEMO DATA" marker. It exists to demonstrate the investigation workflow
 * (hypotheses → evidence → contradictions → confidence → conclusion) without
 * pretending that a model produced these results.
 */

import type {
  ConclusionRecord,
  EvidenceRecord,
  ExecutionTrace,
  HypothesisRecord,
} from '@/lib/api/types';
import type { InvestigationConfig } from '@/lib/investigation-config';

export interface DemoModel {
  demo: true;
  hypotheses: HypothesisRecord[];
  evidence: EvidenceRecord[];
  conclusions: ConclusionRecord[];
  executions: ExecutionTrace[];
  missingEvidence: Array<{ id: string; label: string; status: 'NOT AVAILABLE'; reason: string }>;
  note: string;
}

function isoAt(startIso: string, days: number): string {
  const d = new Date(startIso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function buildDemoModel(config: InvestigationConfig): DemoModel {
  const { investigationId, timeRange } = config;
  const start = timeRange.start;
  const regionName = config.region.name;

  const mkEvidence = (
    id: string,
    hypothesisId: string | null,
    polarity: EvidenceRecord['polarity'],
    summary: string,
    day: number,
    tool: string,
    extra: Record<string, unknown> = {},
  ): EvidenceRecord => ({
    id: `demo-ev-${id}`,
    investigation_id: investigationId,
    hypothesis_id: hypothesisId,
    image_id: null,
    query_id: null,
    model_run_id: null,
    polarity,
    summary,
    provenance: {
      tool_name: tool,
      tool_version: '0.1.0-placeholder',
      simulated: true,
      generator: 'saatraai.demo',
      ...extra,
    },
    source_uri: null,
    source_reference: `SIMULATED · ${regionName}`,
    created_at: isoAt(start, day),
  });

  const hypotheses: HypothesisRecord[] = [
    {
      id: 'demo-h1',
      investigation_id: investigationId,
      statement: `Increased monsoon rainfall frequency explains the observed rise in flood extent in ${regionName}.`,
      assessment_state: 'proposed',
      confidence: null,
      created_at: isoAt(start, 3),
      evidence: [],
    },
    {
      id: 'demo-h2',
      investigation_id: investigationId,
      statement: `Urban expansion and impervious surface growth amplify runoff in ${regionName}.`,
      assessment_state: 'proposed',
      confidence: null,
      created_at: isoAt(start, 4),
      evidence: [],
    },
    {
      id: 'demo-h3',
      investigation_id: investigationId,
      statement: 'Vegetation loss reduces infiltration and increases peak discharge.',
      assessment_state: 'proposed',
      confidence: null,
      created_at: isoAt(start, 5),
      evidence: [],
    },
    {
      id: 'demo-h4',
      investigation_id: investigationId,
      statement: 'Drainage and infrastructure changes concentrate flow into previously safe areas.',
      assessment_state: 'proposed',
      confidence: null,
      created_at: isoAt(start, 6),
      evidence: [],
    },
    {
      id: 'demo-h5',
      investigation_id: investigationId,
      statement: 'Terrain and runoff concentration — unchanged between periods — cannot explain the increase.',
      assessment_state: 'proposed',
      confidence: null,
      created_at: isoAt(start, 7),
      evidence: [],
    },
  ];

  const evidence: EvidenceRecord[] = [
    mkEvidence('1', 'demo-h1', 'supporting', 'Simulated rainfall totals for the wettest month exceed the 2019–2021 baseline by 38%.', 12, 'rainfall-aggregator', { dataset: 'SIMULATED-gpm-like' }),
    mkEvidence('2', 'demo-h1', 'supporting', 'Simulated flood-water fraction maps show expanded inundation in the same weeks as rainfall peaks.', 20, 'bi-temporal-change-detection', { metric: 'water_fraction_delta' }),
    mkEvidence('3', 'demo-h1', 'contradicting', 'Simulated dry-season scenes show no water expansion despite similar antecedent rainfall.', 46, 'bi-temporal-change-detection', { season: 'dry' }),
    mkEvidence('4', 'demo-h2', 'supporting', 'Simulated built-up classification shows +11.4% impervious area along the eastern corridor.', 30, 'landcover-transition', { metric: 'builtup_delta_pct' }),
    mkEvidence('5', 'demo-h2', 'supporting', 'Simulated runoff-response hotspots spatially overlap the newly built-up cells.', 41, 'zonal-overlay', { overlap: 0.72 }),
    mkEvidence('6', 'demo-h3', 'supporting', 'Simulated NDVI decline of 0.17 in the northwestern fringe coincides with expanding water extent.', 34, 'vegetation-index', { metric: 'ndvi_delta' }),
    mkEvidence('7', 'demo-h3', 'neutral', 'Simulated NDVI stability in the southern block neither supports nor weakens the vegetation hypothesis.', 52, 'vegetation-index', { metric: 'ndvi_delta' }),
    mkEvidence('8', 'demo-h4', 'insufficient', 'Drainage network records are not available on this deployment — hypothesis cannot be tested.', 58, 'unavailable-provider', { provider: 'municipal-drainage' }),
    mkEvidence('9', 'demo-h5', 'supporting', 'Simulated DEM derivatives are identical across periods (terrain is static), so terrain change cannot explain the increase.', 15, 'terrain-derivative', { static_layer: true }),
    mkEvidence('10', 'demo-h2', 'contradicting', 'Simulated high-resolution check shows one flood hotspot outside any built-up growth cell.', 64, 'optical-vqa', { review: 'simulated-human-check' }),
    mkEvidence('11', 'demo-h1', 'neutral', 'Simulated cloud cover limits optical confirmation for 9 of 26 candidate dates.', 70, 'scene-screening', { cloud_pct: 62 }),
    mkEvidence('12', 'demo-h4', 'insufficient', 'Model GeoChat VQA unavailable in this deployment — visual question answering could not corroborate drainage effects.', 72, 'optical-vqa', { model_state: 'not_configured' }),
  ];

  /* attach evidence to hypotheses */
  for (const h of hypotheses) {
    h.evidence = evidence.filter((e) => e.hypothesis_id === h.id);
    const decisive = h.evidence.filter((e) => e.polarity === 'supporting' || e.polarity === 'contradicting');
    const supporting = h.evidence.filter((e) => e.polarity === 'supporting').length;
    h.confidence = decisive.length > 0 ? Math.round((supporting / decisive.length) * 100) / 100 : null;
    h.assessment_state = decisive.length === 0 ? 'inconclusive' : h.confidence !== null && h.confidence >= 0.6 ? 'supported' : 'under_review';
  }

  const conclusions: ConclusionRecord[] = [
    {
      id: 'demo-c1',
      investigation_id: investigationId,
      hypothesis_id: 'demo-h1',
      state: 'inconclusive',
      summary:
        'The available simulated evidence supports a rainfall-driven explanation for the increase in flood extent, because flood-water expansion coincides with simulated rainfall peaks. However, the dry-season contradiction keeps this hypothesis under review rather than confirmed.',
      confidence: 0.66,
      rationale: { simulated: true, supporting: 3, contradicting: 1, insufficient: 0 },
      created_at: isoAt(start, 74),
    },
    {
      id: 'demo-c2',
      investigation_id: investigationId,
      hypothesis_id: 'demo-h2',
      state: 'draft',
      summary:
        'The available simulated evidence supports urban expansion as a contributing factor — built-up growth overlaps simulated runoff hotspots — but one hotspot lies outside the growth cells, so the hypothesis is strengthened only partially.',
      confidence: 0.58,
      rationale: { simulated: true, supporting: 2, contradicting: 1, insufficient: 0 },
      created_at: isoAt(start, 75),
    },
    {
      id: 'demo-c3',
      investigation_id: investigationId,
      hypothesis_id: 'demo-h4',
      state: 'inconclusive',
      summary:
        'Available evidence is insufficient to assess drainage changes: municipal records are not available and the VQA model is not configured on this deployment.',
      confidence: null,
      rationale: { simulated: true, supporting: 0, contradicting: 0, insufficient: 2 },
      created_at: isoAt(start, 76),
    },
  ];

  const executions: ExecutionTrace[] = [
    {
      task_id: 'demo-task-1',
      query_id: 'demo-query-1',
      selected_task: 'bi_temporal_change',
      selected_tool: 'bi-temporal-change-detection',
      model_version: '0.1.0-placeholder',
      parameters: { threshold: 0.35 },
      input_ids: ['demo-scene-a', 'demo-scene-b'],
      status: 'failed',
      started_at: isoAt(start, 20),
      completed_at: isoAt(start, 20),
      output_references: [],
      error: 'NOT_IMPLEMENTED: model is unavailable',
      evidence_id: 'demo-ev-2',
      idempotent_replay: false,
    },
    {
      task_id: 'demo-task-2',
      query_id: 'demo-query-1',
      selected_task: 'single_image_vqa',
      selected_tool: 'optical-vqa',
      model_version: 'geochat-7B',
      parameters: { question: 'Describe visible water extent' },
      input_ids: ['demo-scene-a'],
      status: 'failed',
      started_at: isoAt(start, 72),
      completed_at: isoAt(start, 72),
      output_references: [],
      error: 'NOT_IMPLEMENTED: model is unavailable (GEOCHAT_MODEL_PATH unset)',
      evidence_id: 'demo-ev-12',
      idempotent_replay: false,
    },
  ];

  const missingEvidence = [
    { id: 'm1', label: 'Historical drainage network maps', status: 'NOT AVAILABLE' as const, reason: 'No municipal data integration on this deployment.' },
    { id: 'm2', label: 'Gauge-verified rainfall observations', status: 'NOT AVAILABLE' as const, reason: 'Rainfall provider NOT CONFIGURED; simulated series used in demo only.' },
    { id: 'm3', label: 'High-resolution imagery (<1 m)', status: 'NOT AVAILABLE' as const, reason: 'No very-high-resolution provider configured.' },
    { id: 'm4', label: 'Infrastructure commissioning records', status: 'NOT AVAILABLE' as const, reason: 'No infrastructure dataset connected.' },
  ];

  return {
    demo: true,
    hypotheses,
    evidence,
    conclusions,
    executions,
    missingEvidence,
    note: 'All records in this investigation are SIMULATED for demonstration. They were not produced by a satellite or a model on this deployment.',
  };
}
