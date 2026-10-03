'use client';

/** Shared TanStack Query hooks — cache, loading, error, refetch, invalidation. */

import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  executionApi,
  imageApi,
  investigationApi,
  projectApi,
  reasoningApi,
  toolApi,
} from '@/lib/api';
import type {
  ConclusionRecord,
  EvidenceRecord,
  ExecutionTrace,
  HypothesisRecord,
  IngestedImage,
  Investigation,
  InvestigationQuery,
  Project,
  RegisteredTool,
} from '@/lib/api/types';
import {
  getInvestigationConfig,
  type AnalysisDepth,
  type EvidenceSourceKind,
  type EvidenceStrictness,
  type InvestigationConfig,
  type InvestigationMode,
  type RegionSelection,
} from '@/lib/investigation-config';

export const queryKeys = {
  projects: (search?: string) => ['projects', search ?? ''] as const,
  investigations: (params: Record<string, unknown>) => ['investigations', params] as const,
  investigation: (id: string) => ['investigation', id] as const,
  queries: (id: string) => ['investigation', id, 'queries'] as const,
  images: (id: string) => ['investigation', id, 'images'] as const,
  executions: (id: string) => ['investigation', id, 'executions'] as const,
  evidence: (id: string) => ['investigation', id, 'evidence'] as const,
  hypotheses: (id: string) => ['investigation', id, 'hypotheses'] as const,
  conclusions: (id: string) => ['investigation', id, 'conclusions'] as const,
  tools: ['tools'] as const,
};

export function useProjects(search?: string): UseQueryResult<Project[]> {
  return useQuery({
    queryKey: queryKeys.projects(search),
    queryFn: async () => (await projectApi.list({ search, page_size: 100 })).items,
  });
}

export function useInvestigations(params: {
  page?: number;
  page_size?: number;
  status?: Investigation['status'];
  search?: string;
  project_id?: string;
}) {
  return useQuery({
    queryKey: queryKeys.investigations(params as Record<string, unknown>),
    queryFn: () => investigationApi.list(params),
  });
}

export function useTools(): UseQueryResult<RegisteredTool[]> {
  return useQuery({
    queryKey: queryKeys.tools,
    queryFn: async () => (await toolApi.list()).tools,
    staleTime: 5 * 60_000,
  });
}

export interface InvestigationBundle {
  investigation: Investigation | null;
  config: InvestigationConfig | null;
  queries: InvestigationQuery[] | null;
  images: IngestedImage[] | null;
  executions: ExecutionTrace[] | null;
  evidence: EvidenceRecord[] | null;
  hypotheses: HypothesisRecord[] | null;
  conclusions: ConclusionRecord[] | null;
  isLoading: boolean;
  /** Keys of sub-resources whose endpoint is unavailable on this backend. */
  unavailable: Set<string>;
  refetchAll: () => void;
}

function items<T>(data: { items: T[] } | T[] | null | undefined): T[] | null {
  if (!data) return null;
  return Array.isArray(data) ? data : data.items;
}

/**
 * Build the working config from the SERVER-persisted investigation record.
 * Region, period, sources and the question live in the database; mode /
 * strictness / depth are presentation preferences and stay local.
 */
function configFromServer(inv: Investigation | null): InvestigationConfig | null {
  const c = inv?.configuration;
  if (!inv || !c || !c.region_polygon || c.region_polygon.length < 3 || !c.time_start || !c.time_end) return null;
  return {
    investigationId: inv.id,
    question: c.question ?? inv.title,
    region: {
      name: c.region_name ?? 'Region from server record',
      polygon: c.region_polygon as RegionSelection['polygon'],
      source: (c.region_source as RegionSelection['source'] | undefined) ?? 'preset',
    },
    timeRange: { start: c.time_start, end: c.time_end },
    sources: (c.evidence_sources ?? []) as EvidenceSourceKind[],
    mode: 'real' as InvestigationMode,
    strictness: 'standard' as EvidenceStrictness,
    depth: 'balanced' as AnalysisDepth,
    createdAt: inv.created_at,
  };
}

/** Full investigation bundle — workspace, reports and graph all consume this. */
export function useInvestigationBundle(id: string | undefined): InvestigationBundle {
  const results = useQueries({
    queries: [
      { queryKey: queryKeys.investigation(id ?? ''), queryFn: () => investigationApi.get(id ?? ''), enabled: Boolean(id) },
      { queryKey: queryKeys.queries(id ?? ''), queryFn: () => investigationApi.listQueries(id ?? ''), enabled: Boolean(id) },
      { queryKey: queryKeys.images(id ?? ''), queryFn: () => imageApi.list(id ?? ''), enabled: Boolean(id) },
      { queryKey: queryKeys.executions(id ?? ''), queryFn: () => executionApi.list(id ?? ''), enabled: Boolean(id) },
      { queryKey: queryKeys.evidence(id ?? ''), queryFn: () => reasoningApi.listEvidence(id ?? ''), enabled: Boolean(id) },
      { queryKey: queryKeys.hypotheses(id ?? ''), queryFn: () => reasoningApi.listHypotheses(id ?? ''), enabled: Boolean(id) },
      { queryKey: queryKeys.conclusions(id ?? ''), queryFn: () => reasoningApi.listConclusions(id ?? ''), enabled: Boolean(id) },
    ],
  });

  const [invR, qR, imgR, execR, evR, hypR, conR] = results as [
    UseQueryResult<Investigation>,
    UseQueryResult<{ items: InvestigationQuery[] } | InvestigationQuery[] | null>,
    UseQueryResult<{ items: IngestedImage[] } | null>,
    UseQueryResult<ExecutionTrace[] | null>,
    UseQueryResult<{ items: EvidenceRecord[] } | null>,
    UseQueryResult<{ items: HypothesisRecord[] } | null>,
    UseQueryResult<{ items: ConclusionRecord[] } | null>,
  ];

  const unavailable = new Set<string>();
  if (qR.data === null) unavailable.add('queries');
  if (imgR.data === null) unavailable.add('images');
  if (execR.data === null) unavailable.add('executions');
  if (evR.data === null) unavailable.add('evidence');
  if (hypR.data === null) unavailable.add('hypotheses');
  if (conR.data === null) unavailable.add('conclusions');

  const refetchAll = () => results.forEach((r) => r.refetch());

  /* server record is the source of truth for region/period/sources; the local
     record only contributes presentation preferences (mode/strictness/depth) */
  const localConfig = id ? getInvestigationConfig(id) : null;
  const serverConfig = configFromServer(invR.data ?? null);
  const config: InvestigationConfig | null = (() => {
    if (!serverConfig) return localConfig;
    if (!localConfig) return serverConfig;
    return {
      ...serverConfig,
      mode: localConfig.mode,
      strictness: localConfig.strictness,
      depth: localConfig.depth,
    };
  })();

  return {
    investigation: invR.data ?? null,
    config,
    queries: items(qR.data),
    images: items(imgR.data),
    executions: items(execR.data),
    evidence: items(evR.data),
    hypotheses: items(hypR.data),
    conclusions: items(conR.data),
    isLoading: results.some((r) => r.isPending),
    unavailable,
    refetchAll,
  };
}

/** Compact per-investigation stats for list cards (bounded fan-out). */
export function useInvestigationSummaries(investigations: Investigation[] | undefined, limit = 10) {
  const subset = (investigations ?? []).slice(0, limit);
  const results = useQueries({
    queries: subset.flatMap((inv) => [
      {
        queryKey: queryKeys.evidence(inv.id),
        queryFn: () => reasoningApi.listEvidence(inv.id),
        staleTime: 20_000,
      },
      {
        queryKey: queryKeys.images(inv.id),
        queryFn: () => imageApi.list(inv.id),
        staleTime: 20_000,
      },
    ]),
  });

  const stats = new Map<string, { evidence: number | null; images: number | null }>();
  subset.forEach((inv, i) => {
    const ev = results[i * 2] as UseQueryResult<{ items: EvidenceRecord[] } | null>;
    const img = results[i * 2 + 1] as UseQueryResult<{ items: IngestedImage[] } | null>;
    stats.set(inv.id, {
      evidence: ev.data ? ev.data.items.length : ev.data === null ? null : null,
      images: img.data ? img.data.items.length : img.data === null ? null : null,
    });
  });

  return {
    stats,
    evidenceAvailable: subset.length > 0 && (results[0]?.data !== null),
    isLoading: results.some((r) => r.isPending),
  };
}
