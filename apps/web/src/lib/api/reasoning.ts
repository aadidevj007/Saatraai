/** Reasoning + system-status read services (extended endpoints; degrade honestly). */

import { apiRequest } from './client';
import type { ConclusionRecord, EvidenceRecord, HypothesisRecord } from './types';

export interface SystemStatusReport {
  services: Array<{
    id: string;
    label: string;
    state: 'online' | 'offline' | 'degraded' | 'not_configured' | 'unknown';
    detail?: string;
  }>;
  checked_at: string;
}

/**
 * All of these hit read endpoints added alongside the existing backend routes
 * (evidence / hypotheses / conclusions / queries / images / executions lists +
 * system status). When an endpoint is absent the client receives `null` and the
 * UI shows an honest NOT AVAILABLE state instead of fabricating content.
 */
export const reasoningApi = {
  listEvidence: (investigationId: string) =>
    apiRequest<{ items: EvidenceRecord[] } | null>(`/investigations/${investigationId}/evidence`, {
      nullOn404: true,
    }),

  listHypotheses: (investigationId: string) =>
    apiRequest<{ items: HypothesisRecord[] } | null>(
      `/investigations/${investigationId}/hypotheses`,
      { nullOn404: true },
    ),

  listConclusions: (investigationId: string) =>
    apiRequest<{ items: ConclusionRecord[] } | null>(
      `/investigations/${investigationId}/conclusions`,
      { nullOn404: true },
    ),

  systemStatus: () =>
    apiRequest<SystemStatusReport | null>('/status', { nullOn404: true }),
};
