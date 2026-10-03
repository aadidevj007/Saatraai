'use client';

/** Investigation history: filters, search, sort, open, delete. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Search, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  SectionHeader,
  Segmented,
  Select,
  Skeleton,
} from '@/components/ui';
import { usePageTitle } from '@/components/shell/shell-context';
import { apiRequest, errorMessage } from '@/lib/api';
import type { Investigation, InvestigationStatus } from '@/lib/api/types';
import { useInvestigations, useInvestigationSummaries } from '@/lib/hooks/queries';
import { getInvestigationConfig, removeInvestigationConfig } from '@/lib/investigation-config';
import { useToast } from '@/lib/state/toast';
import { timeAgo } from '@/lib/utils';

type StatusFilter = 'all' | 'planned' | 'running' | 'complete' | 'blocked';
type SortKey = 'newest' | 'oldest' | 'status';

const STATUS_TONE = {
  planned: 'neutral',
  running: 'primary',
  complete: 'success',
  blocked: 'danger',
} as const;

export default function InvestigationsPage() {
  usePageTitle('Investigations');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [pendingDelete, setPendingDelete] = useState<Investigation | null>(null);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const query = useInvestigations({
    page: 1,
    page_size: 100,
    status: status === 'all' ? undefined : (status as InvestigationStatus),
    search: debounced || undefined,
  });
  const { stats } = useInvestigationSummaries(query.data?.items, 20);

  const sorted = useMemo(() => {
    const list = [...(query.data?.items ?? [])];
    if (sort === 'newest') list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === 'oldest') list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sort === 'status') list.sort((a, b) => a.status.localeCompare(b.status));
    return list;
  }, [query.data, sort]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest<void>(`/investigations/${id}`, { method: 'DELETE' });
    },
    onSuccess: (_data, id) => {
      removeInvestigationConfig(id);
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
      queryClient.invalidateQueries({ queryKey: ['investigation', id] });
      toast({ variant: 'success', title: 'Investigation deleted', description: 'Dependent records removed; audit artifacts retained.' });
      setPendingDelete(null);
    },
    onError: (error) =>
      toast({ variant: 'error', title: 'Delete failed', description: errorMessage(error) }),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Investigations</h1>
          <p className="mt-1 text-[13px] text-ink-dim">Every investigation you own, newest first.</p>
        </div>
        <Link href="/investigations/new">
          <Button variant="primary" icon={<Plus className="h-4 w-4" />}>New Investigation</Button>
        </Link>
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles…"
            className="pl-9"
            aria-label="Search investigations"
          />
        </div>
        <Segmented
          ariaLabel="Filter by status"
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'planned', label: 'Planned' },
            { value: 'running', label: 'Running' },
            { value: 'complete', label: 'Complete' },
            { value: 'blocked', label: 'Blocked' },
          ]}
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort" className="w-36">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="status">Status</option>
        </Select>
      </div>

      {/* list */}
      <div className="mt-5">
        {query.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-line bg-card p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2.5 h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState error={errorMessage(query.error)} onRetry={() => query.refetch()} />
        ) : sorted.length === 0 ? (
          <EmptyState
            title={debounced || status !== 'all' ? 'No investigations match these filters' : 'No investigations yet'}
            description={
              debounced || status !== 'all'
                ? 'Clear the search or switch the status filter.'
                : 'Start your first Earth observation investigation.'
            }
            action={
              debounced || status !== 'all'
                ? { label: 'Clear filters', onClick: () => { setSearch(''); setDebounced(''); setStatus('all'); } }
                : { label: 'Start investigation', onClick: () => router.push('/investigations/new') }
            }
          />
        ) : (
          <SectionHeader
            title={`${sorted.length} investigation${sorted.length === 1 ? '' : 's'}`}
            description="Owned by your account · server-side authorized"
          />
        )}

        <ul className="mt-4 space-y-3">
          {sorted.map((inv) => {
            const config = getInvestigationConfig(inv.id);
            const serverQuestion = inv.configuration?.question ?? null;
            const serverRegion = inv.configuration?.region_name ?? null;
            const serverRange =
              inv.configuration?.time_start && inv.configuration?.time_end
                ? `${inv.configuration.time_start} → ${inv.configuration.time_end}`
                : null;
            const invStats = stats.get(inv.id);
            return (
              <li key={inv.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="truncate text-[14px] font-medium text-ink">{inv.title}</h3>
                      <Badge tone={STATUS_TONE[inv.status] ?? 'neutral'}>{inv.status}</Badge>
                      {config?.mode === 'demo' && <Badge tone="demo">DEMO DATA</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-dim">
                      {config?.question ?? serverQuestion ?? 'Question recorded server-side; open the workspace to inspect queries.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
                      <span>{config?.region.name ?? serverRegion ?? 'region not set'}</span>
                      <span>{config ? `${config.timeRange.start} → ${config.timeRange.end}` : (serverRange ?? 'period not set')}</span>
                      <span>created {timeAgo(inv.created_at)}</span>
                      <span>updated {timeAgo(inv.updated_at)}</span>
                      {invStats?.evidence !== null && invStats?.evidence !== undefined && (
                        <span className="text-primary/70">{invStats.evidence} evidence</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="secondary" icon={<ArrowRight className="h-3.5 w-3.5" />}
                      onClick={() => router.push(`/investigations/${inv.id}`)}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete investigation"
                      onClick={() => setPendingDelete(inv)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete investigation?"
        description="This removes the investigation and its dependent rows from the database."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-dim">
          <span className="text-ink">{pendingDelete?.title}</span> will be deleted, including its queries, evidence and
          execution traces. Stored raster artifacts and evidence output blobs are retained for audit purposes.
        </p>
      </Modal>
    </div>
  );
}
