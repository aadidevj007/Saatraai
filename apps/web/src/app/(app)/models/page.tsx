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

  const geochatState = statusQuery.data?.services.find((s) => s.id === 'model_geochat')?.state;

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
            <Radar className="h-5 w-5 text-primary" /> Model registry
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Every model and task exposed by the backend tool registry — availability read from live system status.
          </p>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          <StatusDot state={geochatState === 'online' ? 'online' : geochatState === 'degraded' ? 'degraded' : 'not_configured'} />
          geochat · {geochatState ?? 'unknown'}
        </span>
      </div>

      <div className="mt-5">
        {toolsQuery.isPending ? (
          <LoadingState label="Reading tool registry…" rows={4} />
        ) : toolsQuery.isError ? (
          <ErrorState error={errorMessage(toolsQuery.error)} onRetry={() => toolsQuery.refetch()} />
        ) : (
          <div className="space-y-3">
            {toolsQuery.data.map((tool) => {
              const configured = tool.model_name !== 'unintegrated';
              const isOpen = expanded === tool.name;
              return (
                <Panel
                  key={tool.name}
                  title={
                    <span className="flex items-center gap-2">
                      {tool.name}
                      <Badge tone={configured ? (geochatState === 'degraded' ? 'warning' : 'success') : 'danger'}>
                        {configured ? (geochatState === 'degraded' ? 'CONFIGURED · UNVERIFIED' : 'AVAILABLE') : 'MODEL UNAVAILABLE'}
                      </Badge>
                    </span>
                  }
                  subtitle={`${tool.task_type} · ${tool.model_name} @ ${tool.version}`}
                  actions={
                    <button
                      onClick={() => setExpanded(isOpen ? null : tool.name)}
                      className="flex items-center gap-1 text-[11.5px] text-ink-dim hover:text-primary"
                      aria-expanded={isOpen}
                    >
                      Schemas {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  }
                >
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
                    <Fact label="Task" value={tool.task_type} />
                    <Fact label="Model" value={tool.model_name} />
                    <Fact label="Version" value={tool.version} />
                    <Fact label="Modalities" value={tool.accepted_modalities.join(', ') || '—'} />
                    <Fact label="Input configurations" value={tool.accepted_input_configurations.join(', ') || '—'} />
                    <Fact
                      label="Runtime state"
                      value={
                        !configured
                          ? 'placeholder adapter — executes as NOT_IMPLEMENTED'
                          : geochatState === 'not_configured'
                            ? 'GEOCHAT_MODEL_PATH unset'
                            : 'path configured; weights not verified by probe'
                      }
                    />
                  </div>

                  <div className={cn('mt-3 grid gap-3', isOpen ? 'grid-cols-1 md:grid-cols-2' : 'hidden')}>
                    <SchemaBlock title="Parameter schema" schema={tool.parameter_schema} />
                    <SchemaBlock title="Output schema" schema={tool.output_schema} />
                  </div>

                  {!configured && (
                    <p className="mt-3 rounded border border-warning/25 bg-warning/5 px-3 py-2 text-[11.5px] leading-relaxed text-ink-dim">
                      This tool is registered but its model is not integrated: executions complete with an
                      INSUFFICIENT evidence record stating that no scientific output was produced. Nothing is faked.
                    </p>
                  )}
                </Panel>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-[12px] leading-relaxed text-ink-dim">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">Note · </span>
        The registry lists what the backend declares, not what a demo would like to show. Model cards appear here only
        when the API exposes them.
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className="truncate text-[12.5px] text-ink" title={value}>
        {value}
      </div>
    </div>
  );
}

function SchemaBlock({ title, schema }: { title: string; schema: Record<string, unknown> }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">{title}</div>
      <pre className="max-h-56 overflow-auto rounded-lg border border-line bg-void p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-dim">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}
