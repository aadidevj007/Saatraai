/** Report assembly + export (JSON, CSV, GeoJSON, print-to-PDF) from real records. */

import type {
  ConclusionRecord,
  EvidenceRecord,
  ExecutionTrace,
  HypothesisRecord,
  IngestedImage,
  Investigation,
  InvestigationQuery,
} from '@/lib/api/types';
import type { ConfidenceReport } from '@/lib/analysis/confidence';
import type { TimelineEvent } from '@/lib/analysis/timeline';
import type { InvestigationConfig } from '@/lib/investigation-config';
import { downloadBlob, toCsv } from '@/lib/utils';

export interface ReportDocument {
  title: string;
  generated_at: string;
  generator: string;
  provenance: {
    investigation: Investigation;
    config: InvestigationConfig | null;
    record_counts: Record<string, number>;
    api_base?: string;
  };
  question: string | null;
  region: InvestigationConfig['region'] | null;
  time_range: InvestigationConfig['timeRange'] | null;
  hypotheses: HypothesisRecord[];
  evidence: EvidenceRecord[];
  conclusions: ConclusionRecord[];
  executions: ExecutionTrace[];
  queries: InvestigationQuery[];
  images: IngestedImage[];
  timeline: TimelineEvent[];
  confidence: ConfidenceReport | null;
  limitations: string[];
  sources: string[];
}

export function buildReportDocument(input: {
  investigation: Investigation;
  config: InvestigationConfig | null;
  queries: InvestigationQuery[] | null;
  images: IngestedImage[] | null;
  executions: ExecutionTrace[] | null;
  evidence: EvidenceRecord[] | null;
  hypotheses: HypothesisRecord[] | null;
  conclusions: ConclusionRecord[] | null;
  timeline: TimelineEvent[];
  confidence: ConfidenceReport | null;
}): ReportDocument {
  const { investigation, config } = input;
  const evidence = input.evidence ?? [];
  const limitations: string[] = [];

  if (evidence.length === 0) {
    limitations.push('No evidence records exist for this investigation; no scientific finding can be stated.');
  }
  if (evidence.some((e) => e.polarity === 'insufficient')) {
    limitations.push(
      'Some evidence records are INSUFFICIENT because the selected tool was unavailable or the execution failed.',
    );
  }
  if (!input.hypotheses || input.hypotheses.length === 0) {
    limitations.push('No hypothesis records exist; the planner component is not configured on this deployment.');
  }
  limitations.push(
    'Correlation in satellite imagery does not by itself establish causation; conclusions must be read as support or challenge for a hypothesis, never as proof.',
  );
  limitations.push(
    'Provider integrations (Sentinel-1/2 catalogs, rainfall, DEM) are not configured on this deployment; imagery must be supplied manually.',
  );

  const sources: string[] = [];
  for (const img of input.images ?? []) sources.push(`${img.original_filename} (${img.modality})`);
  for (const t of input.executions ?? []) sources.push(`${t.selected_tool} @ ${t.model_version ?? 'unknown'}`);

  return {
    title: `Investigation report — ${investigation.title}`,
    generated_at: new Date().toISOString(),
    generator: 'SAATRAAI web client report builder',
    provenance: {
      investigation,
      config,
      record_counts: {
        queries: (input.queries ?? []).length,
        images: (input.images ?? []).length,
        executions: (input.executions ?? []).length,
        evidence: evidence.length,
        hypotheses: input.hypotheses?.length ?? 0,
        conclusions: input.conclusions?.length ?? 0,
      },
      api_base: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
    },
    question: config?.question ?? input.queries?.[0]?.text ?? null,
    region: config?.region ?? null,
    time_range: config?.timeRange ?? null,
    hypotheses: input.hypotheses ?? [],
    evidence,
    conclusions: input.conclusions ?? [],
    executions: input.executions ?? [],
    queries: input.queries ?? [],
    images: input.images ?? [],
    timeline: input.timeline,
    confidence: input.confidence,
    limitations,
    sources,
  };
}

export function exportReportJson(doc: ReportDocument): void {
  downloadBlob(
    `${slug(doc.title)}-${doc.generated_at.slice(0, 10)}.json`,
    JSON.stringify(doc, null, 2),
    'application/json',
  );
}

export function exportEvidenceCsv(doc: ReportDocument): void {
  const rows = doc.evidence.map((e) => ({
    id: e.id,
    polarity: e.polarity,
    summary: e.summary,
    created_at: e.created_at,
    query_id: e.query_id ?? '',
    model_run_id: e.model_run_id ?? '',
    image_id: e.image_id ?? '',
    tool: String(e.provenance?.tool_name ?? ''),
    tool_version: String(e.provenance?.tool_version ?? ''),
    source_uri: e.source_uri ?? '',
  }));
  downloadBlob(`${slug(doc.title)}-evidence.csv`, toCsv(rows), 'text/csv');
}

export function exportRegionGeoJson(doc: ReportDocument): void {
  const features: unknown[] = [];
  if (doc.region && doc.region.polygon.length >= 3) {
    features.push({
      type: 'Feature',
      properties: { kind: 'roi', name: doc.region.name, investigation: doc.provenance.investigation.id },
      geometry: { type: 'Polygon', coordinates: [[...doc.region.polygon, doc.region.polygon[0]]] },
    });
  }
  const geojson = {
    type: 'FeatureCollection',
    features,
    properties: { investigation: doc.provenance.investigation.title, generated_at: doc.generated_at },
  };
  downloadBlob(`${slug(doc.title)}-region.geojson`, JSON.stringify(geojson, null, 2), 'application/geo+json');
}

export function printReport(): void {
  window.print();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}
