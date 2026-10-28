'use client';

/** Live system status — API, database, storage, models, providers. */

import { useState } from 'react';
import { RefreshCw, ServerCog } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { usePageTitle } from '@/components/shell/shell-context';
import { Badge, Button, LoadingState, Panel, StatusDot } from '@/components/ui';
import { errorMessage, healthApi, providerApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

const STATE_TONE = {
  online: 'success',
  offline: 'danger',
  degraded: 'warning',
  not_configured: 'warning',
  unknown: 'neutral',
} as const;

export default function StatusPage() {
  usePageTitle('System Status');
  const queryClient = useQueryClient();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.probe(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const statusQuery = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const report = await providerApi.status();
      setCheckedAt(new Date().toISOString());
      return report;
    },
    retry: false,
    refetchInterval: 30_000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['system-status'] });
    queryClient.invalidateQueries({ queryKey: ['health'] });
    queryClient.invalidateQueries({ queryKey: ['tools'] });
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-ink">
            <ServerCog className="h-5 w-5 text-primary" /> System status
          </h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Live connectivity probes — integrations that are not deployed are reported as NOT CONFIGURED, never as
            healthy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {checkedAt && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              checked {formatDateTime(checkedAt)}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={refresh} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* API health card */}
      <div className="mt-5">
        <Panel title="API liveness" subtitle="GET /health on the configured API base">
          {healthQuery.isPending ? (
            <LoadingState label="Probing…" rows={1} />
          ) : healthQuery.isError ? (
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <StatusDot state="offline" />
                <span className="text-[13px] text-danger">API unreachable</span>
              </div>
              <p className="text-[12.5px] text-ink-dim">{errorMessage(healthQuery.error)}</p>
              <Button size="sm" variant="secondary" onClick={() => healthQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2">
                <StatusDot state="online" />
                <span className="text-[13px] text-ink">{healthQuery.data.service}</span>
              </span>
              <span className="font-mono text-[11.5px] text-ink-dim">status {healthQuery.data.status}</span>
              <span className="font-mono text-[11.5px] text-ink-dim">version {healthQuery.data.version}</span>
            </div>
          )}
        </Panel>
      </div>

      {/* services */}
      <div className="mt-5">
        <Panel
          title="Services"
          subtitle="Database, storage, models and provider integrations"
          actions={
            statusQuery.isPending ? (
              <span className="font-mono text-[10px] uppercase text-ink-faint">probing…</span>
            ) : (
              <Badge tone="primary">LIVE PROBE</Badge>
            )
          }
          bodyClassName="p-0"
        >
          {statusQuery.isPending ? (
            <LoadingState label="Reading /status…" rows={5} />
          ) : statusQuery.isError || !statusQuery.data ? (
            <div className="p-4">
              <div className="flex items-center gap-2">
                <StatusDot state="not_configured" />
                <span className="text-[13px] text-warning">Extended status endpoint unavailable</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">
                This backend does not expose <span className="font-mono text-ink">GET /api/v1/status</span>, so
                per-service state cannot be reported. The API liveness probe above still applies; nothing else is
                guessed.
              </p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : (
            <ul>
              {statusQuery.data.services.map((service) => (
                <li
                  key={service.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <StatusDot state={service.state as 'online' | 'offline' | 'degraded' | 'not_configured' | 'unknown'} />
                      <span className="text-[13px] text-ink">{service.label}</span>
                      <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">{service.id}</span>
                    </div>
                    {service.detail && (
                      <p className="mt-0.5 pl-4 font-mono text-[11px] leading-snug text-ink-faint">{service.detail}</p>
                    )}
                  </div>
                  <Badge tone={STATE_TONE[service.state as keyof typeof STATE_TONE] ?? 'neutral'}>
                    {service.state.replace('_', ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
        States are produced by server-side probes (TCP checks, SQL ping, path checks) and static deployment facts.
        The page never marks an undeployed integration as online.
      </p>
    </div>
  );
}
