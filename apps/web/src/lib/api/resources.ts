/** Resource services — projects, investigations, queries, executions, images, tools, health. */

import { apiBase, apiRequest } from './client';
import type {
  ExecutionTrace,
  HealthResponse,
  ImageIngestionResponse,
  IngestedImage,
  Investigation,
  InvestigationConfiguration,
  InvestigationQuery,
  InvestigationStatus,
  Page,
  Project,
  ToolRegistryResponse,
} from './types';

export const projectApi = {
  list: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    apiRequest<Page<Project>>(
      `/projects?page=${params.page ?? 1}&page_size=${params.page_size ?? 100}` +
        (params.search ? `&search=${encodeURIComponent(params.search)}` : ''),
    ),
  get: (id: string) => apiRequest<Project>(`/projects/${id}`),
  create: (name: string, description?: string) =>
    apiRequest<Project>('/projects', { method: 'POST', body: { name, description } }),
};

export interface InvestigationListParams {
  page?: number;
  page_size?: number;
  project_id?: string;
  status?: InvestigationStatus;
  search?: string;
}

export const investigationApi = {
  list: (params: InvestigationListParams = {}) => {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('page_size', String(params.page_size ?? 50));
    if (params.project_id) query.set('project_id', params.project_id);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return apiRequest<Page<Investigation>>(`/investigations?${query.toString()}`);
  },
  get: (id: string) => apiRequest<Investigation>(`/investigations/${id}`),
  create: (project_id: string, title: string, configuration?: InvestigationConfiguration) =>
    apiRequest<Investigation>('/investigations', {
      method: 'POST',
      body: { project_id, title, configuration: configuration ?? undefined },
    }),
  /** Persist region / time range / sources on an existing investigation. */
  updateConfiguration: (id: string, configuration: InvestigationConfiguration) =>
    apiRequest<Investigation>(`/investigations/${id}/configuration`, {
      method: 'PATCH',
      body: { configuration },
    }),
  addQuery: (investigationId: string, text: string, sequence?: number) =>
    apiRequest<InvestigationQuery>(`/investigations/${investigationId}/queries`, {
      method: 'POST',
      body: { text, sequence },
    }),
  listQueries: (investigationId: string) =>
    apiRequest<{ items: InvestigationQuery[] } | InvestigationQuery[] | null>(
      `/investigations/${investigationId}/queries`,
      { nullOn404: true },
    ),
};

export const executionApi = {
  execute: (investigationId: string, query: string, imageIds: string[], parameters = {}) =>
    apiRequest<ExecutionTrace>(`/investigations/${investigationId}/executions`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: { query, image_ids: imageIds, parameters },
    }),
  getTrace: (investigationId: string, taskId: string) =>
    apiRequest<ExecutionTrace>(`/investigations/${investigationId}/executions/${taskId}`),
  /** Extended read endpoint (added in apps/api); null when unavailable. */
  list: (investigationId: string) =>
    apiRequest<ExecutionTrace[] | null>(`/investigations/${investigationId}/executions`, {
      nullOn404: true,
    }),
};

export const imageApi = {
  list: (investigationId: string) =>
    apiRequest<{ items: IngestedImage[] } | null>(`/investigations/${investigationId}/images`, {
      nullOn404: true,
    }),
  upload: async (investigationId: string, files: File[]): Promise<ImageIngestionResponse> => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return apiRequest<ImageIngestionResponse>(`/investigations/${investigationId}/images`, {
      method: 'POST',
      body: form,
    });
  },
};

export const toolApi = {
  list: () => apiRequest<ToolRegistryResponse>('/tools'),
};

export const healthApi = {
  /** Liveness lives at the API root, outside /api/v1. */
  probe: async (): Promise<HealthResponse> => {
    const response = await fetch(`${apiBase()}/health`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`API health returned ${response.status}`);
    return (await response.json()) as HealthResponse;
  },
};
