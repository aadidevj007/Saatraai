'use client';

/** Model registry — derived from the live /tools registry and system status. */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Radar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { usePageTitle } from '@/components/shell/shell-context';
import { Badge, ErrorState, LoadingState, Panel, StatusDot } from '@/components/ui';
import { errorMessage, providerApi, toolApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ModelsPage() {
  usePageTitle('Models');

  const toolsQuery = useQuery({ queryKey: ['tools'], queryFn: async () => (await toolApi.list()).tools });
  const statusQuery = useQuery({ queryKey: ['system-status'], queryFn: () => providerApi.status(), retry: false });
  const [expanded, setExpanded] = useState<string | null>(null);

  const geochatService = statusQuery.data?.services.find((s) => s.id === 'model_geochat');
  const geochatState = geochatService?.state;
  const geochatDetail = geochatService?.detail;

  return (
    <div className="mx-auto max-w-5xl px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-font flex items-center gap-2 text-[24px] font-semibold tracking-tight text-ink">
            <Radar className="h-5 w-5 text-primary" /> Model registry
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Registered analysis tools and their live runtime availability.
          </p>
        </div>
        <span className="glass-option inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-dim">
          <StatusDot
            state={
              geochatState === 'online'
                ? 'online'
                : geochatState === 'degraded'
                  ? 'degraded'
                  : 'not_configured'
            }
          />
          geochat · {geochatState ? geochatState.replace('_', ' ') : 'checking'}
        </span>
      </div>

      <div className="mt-6">
        {toolsQuery.isPending ? (
          <LoadingState label="Loading model registry…" rows={4} />
        ) : toolsQuery.isError ? (
          <ErrorState error={errorMessage(toolsQuery.error)} onRetry={() => toolsQuery.refetch()} />
        ) : (
          <div className="space-y-3.5">
            {toolsQuery.data.map((tool) => {
              const integrated = tool.model_name !== 'unintegrated';
              const isGeoChat = tool.model_name.toLowerCase().includes('geochat');
              const runtimeUnavailable = isGeoChat && geochatState === 'not_configured';
              const runtimeDegraded = isGeoChat && geochatState === 'degraded';
              const badgeTone =
                !integrated || runtimeUnavailable
                  ? 'danger'
                  : runtimeDegraded
                    ? 'warning'
                    : 'success';
              const badgeLabel = !integrated
                ? 'NOT INTEGRATED'
                : runtimeUnavailable
                  ? 'NOT CONFIGURED'
                  : runtimeDegraded
                    ? 'RUNTIME MISSING'
                    : !isGeoChat || geochatState === 'online'
                      ? 'AVAILABLE'
                      : 'CHECKING';

              const runtimeStateText = !integrated
                ? 'Placeholder slot — returns NOT_IMPLEMENTED until a model adapter is wired'
                : !isGeoChat
                  ? 'Built-in deterministic raster preflight ready'
                  : runtimeUnavailable
                    ? geochatDetail ?? 'GEOCHAT_MODEL_PATH is not configured on the API host'
                    : runtimeDegraded
                      ? geochatDetail ?? 'Weights found, but GeoChat/PyTorch runtime is not installed'
                      : geochatState === 'online'
                        ? geochatDetail ?? 'GeoChat weights and runtime ready'
                        : 'Checking runtime availability…';

              const isOpen = expanded === tool.name;
              return (
                <Panel
                  key={tool.name}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {tool.name}
                      <Badge tone={badgeTone}>{badgeLabel}</Badge>
                    </span>
                  }
                  subtitle={`${tool.task_type} · ${tool.model_name} @ ${tool.version}`}
                  actions={
                    <button
                      onClick={() => setExpanded(isOpen ? null : tool.name)}
                      className="glass-option flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11.5px] text-ink-dim hover:text-ink"
                      aria-expanded={isOpen}
                    >
                      Schemas {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  }
                >
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
                    <Fact label="Task" value={tool.task_type} />
                    <Fact label="Model" value={tool.model_name} />
                    <Fact label="Version" value={tool.version} />
                    <Fact label="Modalities" value={tool.accepted_modalities.join(', ') || '—'} />
                    <Fact label="Input mode" value={tool.accepted_input_configurations.join(', ') || '—'} />
                    <Fact label="Runtime state" value={runtimeStateText} />
                  </div>

                  <div className={cn('mt-4 grid gap-3', isOpen ? 'grid-cols-1 md:grid-cols-2' : 'hidden')}>
                    <SchemaBlock title="Parameter schema" schema={tool.parameter_schema} />
                    <SchemaBlock title="Output schema" schema={tool.output_schema} />
                  </div>

                  {(!integrated || runtimeUnavailable || runtimeDegraded) && (
                    <p className="mt-3.5 rounded-xl border border-warning/25 bg-warning/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-dim">
                      {runtimeUnavailable
                        ? 'To enable GeoChat VQA & grounding, place the MBZUAI/geochat-7B checkpoint on a GPU API host, install the upstream GeoChat runtime, and set GEOCHAT_MODEL_PATH.'
                        : runtimeDegraded
                          ? 'Model weights directory is present, but the upstream GeoChat/PyTorch runtime is not installed in this API environment.'
                          : 'This task slot is registered in the API contract as a placeholder and safely returns INSUFFICIENT / NOT_IMPLEMENTED instead of synthetic output.'}
                    </p>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className="mt-0.5 break-words text-[12.5px] leading-snug text-ink" title={value}>
        {value}
      </div>
    </div>
  );
}

function SchemaBlock({ title, schema }: { title: string; schema: Record<string, unknown> }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">{title}</div>
      <pre className="max-h-56 overflow-auto rounded-lg border border-line bg-elevated p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-dim">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}
