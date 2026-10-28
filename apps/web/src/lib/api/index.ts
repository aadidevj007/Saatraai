/**
 * Central service registry — the app imports services from here, never raw fetch().
 * Each namespace maps to one bounded context of the SAATRAAI API surface.
 */

import { computeConfidence, assessHypothesis } from '@/lib/analysis/confidence';
import { buildEvidenceGraph } from '@/lib/analysis/graph';
import { buildTimeline } from '@/lib/analysis/timeline';
import {
  buildReportDocument,
  exportEvidenceCsv,
  exportRegionGeoJson,
  exportReportJson,
  printReport,
} from '@/lib/analysis/report';

export { authApi } from './auth';
export { projectApi, investigationApi, executionApi, imageApi, toolApi, healthApi } from './resources';
export { reasoningApi, type SystemStatusReport } from './reasoning';
export { ApiError, apiBase, apiRequest, errorMessage, probeApi } from './client';

import { reasoningApi } from './reasoning';
import type { SystemStatusReport } from './reasoning';

/** Evidence reads. */
export const evidenceApi = {
  list: reasoningApi.listEvidence,
};

/** Hypothesis reads. */
export const hypothesisApi = {
  list: reasoningApi.listHypotheses,
};

/** Client-side analysis over real records. */
export const analysisApi = {
  computeConfidence,
  assessHypothesis,
};

/** Timeline assembly over real records. */
export const timelineApi = {
  build: buildTimeline,
};

/** Evidence graph assembly over real records. */
export const graphApi = {
  build: buildEvidenceGraph,
};

/** Report assembly + export. */
export const reportApi = {
  build: buildReportDocument,
  exportJson: exportReportJson,
  exportCsv: exportEvidenceCsv,
  exportGeoJson: exportRegionGeoJson,
  print: printReport,
};

/** System / provider status. */
export const providerApi = {
  status: (): Promise<SystemStatusReport | null> => reasoningApi.systemStatus(),
};
