'use client';

/** Dashboard — mission-control overview. */

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, Database, FileCheck2, Plus, Telescope, Zap } from 'lucide-react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Metric,
  Reveal,
  SectionHeader,
  Skeleton,
  StatusDot,
  TiltCard,
} from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { errorMessage } from '@/lib/api';
import type { Investigation } from '@/lib/api/types';
import { useInvestigations, useInvestigationSummaries } from '@/lib/hooks/queries';
import { getInvestigationConfig } from '@/lib/investigation-config';
import { usePageTitle } from '@/components/shell/shell-context';
import { greeting, timeAgo } from '@/lib/utils';

const STATUS_TONE = {
  planned: 'neutral',
  running: 'primary',
  complete: 'success',
  blocked: 'danger',
} as const;

export default function OverviewPage() {
  usePageTitle('Overview');
  const router = useRouter();
  const { user, google, preferences } = useAuth();
  const name = google?.name ?? user?.display_name ?? user?.email ?? 'Researcher';

  const investigationsQuery = useInvestigations({ page: 1, page_size: 20 });
  const { stats, evidenceAvailable, isLoading: summariesLoading } = useInvestigationSummaries(
    investigationsQuery.data?.items,
    10,
  );

  const items = useMemo(() => investigationsQuery.data?.items ?? [], [investigationsQuery.data]);
  const total = investigationsQuery.data?.total ?? 0;

  const counts = useMemo(() => {
    const active = items.filter((i) => i.status === 'planned' || i.status === 'running').length;
    const completed = items.filter((i) => i.status === 'complete').length;
    let evidence = 0;
    let images = 0;
    let evidenceKnown = false;
    let imagesKnown = false;
    for (const [, value] of stats) {
      if (value.evidence !== null) {
        evidence += value.evidence;
        evidenceKnown = true;
      }
      if (value.images !== null) {
        images += value.images;
        imagesKnown = true;
      }
    }
    return { active, completed, evidence, images, evidenceKnown, imagesKnown };
  }, [items, stats]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-7">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-faint">
            <Activity className="h-3 w-3 text-success" />
            {greeting()} · {new Date().toISOString().slice(0, 10)}
          </p>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight text-ink">Ready to investigate Earth?</h1>
          <p className="mt-1 text-[13px] text-ink-dim">
            Signed in as {name}
            {preferences?.research_interest ? ` · investigating ${preferences.research_interest}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/investigations/new">
            <Button variant="primary" size="lg" icon={<Plus className="h-4 w-4" />}>
              New Investigation
            </Button>
          </Link>
          <Link href="/investigations">
            <Button variant="secondary" size="lg" icon={<Telescope className="h-4 w-4" />}>
              All investigations
            </Button>
          </Link>
        </div>
      </div>

      {/* stats */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            key: 'active',
            el: (
              <Metric
                label="Active investigations"
                value={investigationsQuery.isPending ? <Skeleton className="h-6 w-10" /> : counts.active}
                hint={`of ${total} total`}
                tone="primary"
                icon={<Telescope className="h-3.5 w-3.5" />}
              />
            ),
          },
          {
            key: 'completed',
            el: (
              <Metric
                label="Completed"
                value={investigationsQuery.isPending ? <Skeleton className="h-6 w-10" /> : counts.completed}
                hint="status = complete"
                tone="success"
                icon={<FileCheck2 className="h-3.5 w-3.5" />}
              />
            ),
          },
          {
            key: 'evidence',
            el: (
              <Metric
                label="Evidence collected"
                value={
                  summariesLoading && evidenceAvailable ? (
                    <Skeleton className="h-6 w-10" />
                  ) : counts.evidenceKnown ? (
                    counts.evidence
                  ) : (
                    <span className="text-[13px] text-ink-faint">NOT AVAILABLE</span>
                  )
                }
                hint="across recent investigations (10)"
                tone={counts.evidenceKnown ? 'warning' : 'neutral'}
                icon={<Zap className="h-3.5 w-3.5" />}
              />
            ),
          },
          {
            key: 'datasets',
            el: (
              <Metric
                label="Datasets"
                value={
                  summariesLoading && evidenceAvailable ? (
                    <Skeleton className="h-6 w-10" />
                  ) : counts.imagesKnown ? (
                    counts.images
                  ) : (
                    <span className="text-[13px] text-ink-faint">NOT AVAILABLE</span>
                  )
                }
                hint="ingested scenes (recent)"
                icon={<Database className="h-3.5 w-3.5" />}
              />
            ),
          },
        ].map((item, i) => (
          <Reveal key={item.key} delay={i * 0.06}>
            <TiltCard maxTilt={5} className="rounded-xl">
              {item.el}
            </TiltCard>
          </Reveal>
        ))}
      </div>

      {/* API offline banner */}
      {investigationsQuery.isError && (
        <div className="mt-6">
          <ErrorState
            error={errorMessage(investigationsQuery.error)}
            title="Unable to load investigations"
            onRetry={() => investigationsQuery.refetch()}
          />
        </div>
      )}

      {/* recent */}
      <div className="mt-9">
        <SectionHeader
          title="Recent investigations"
          description="Question, region, time period and evidence-backed status for your latest work."
          action={
            <Link href="/investigations">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                View all
              </Button>
            </Link>
          }
        />

        <div className="mt-4">
          {investigationsQuery.isPending ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-line bg-card p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-4/5" />
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Telescope className="w-5 h-5" />}
              title="No investigations yet"
              description="Start your first Earth observation investigation: ask a question, define a region and select a time range."
              action={{
                label: 'Start investigation',
                onClick: () => router.push('/investigations/new'),
              }}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {items.slice(0, 6).map((inv) => (
                <InvestigationCard key={inv.id} investigation={inv} stats={stats.get(inv.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* system strip */}
      <div className="mt-9 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 text-[12px] text-ink-dim">
        <span className="flex items-center gap-2">
          <StatusDot state="online" /> Core services respond via /health
        </span>
        <span className="flex items-center gap-2">
          <StatusDot state="not_configured" /> Satellite providers not configured — imagery is uploaded
        </span>
        <Link href="/status" className="ml-auto text-primary hover:underline">
          Full system status →
        </Link>
      </div>
    </div>
  );
}

function InvestigationCard({
  investigation,
  stats,
}: {
  investigation: Investigation;
  stats?: { evidence: number | null; images: number | null };
}) {
  const config = getInvestigationConfig(investigation.id);
  const serverQuestion = investigation.configuration?.question ?? null;
  const serverRegion = investigation.configuration?.region_name ?? null;
  const tone = STATUS_TONE[investigation.status] ?? 'neutral';

  return (
    <TiltCard maxTilt={4} className="rounded-xl">
      <Link
        href={`/investigations/${investigation.id}`}
        className="card block p-4 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-medium text-ink">{investigation.title}</h3>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-dim">
              {config?.question ?? serverQuestion ?? 'Question not recorded on this device — open to inspect server-side queries.'}
            </p>
          </div>
          <Badge tone={tone}>{investigation.status}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          <span>{config?.region.name ?? serverRegion ?? 'REGION NOT SET'}</span>
          <span>
            {config ? `${config.timeRange.start} → ${config.timeRange.end}` : 'PERIOD NOT SET'}
          </span>
          {config && <span className={config.mode === 'demo' ? 'text-[#c4b5fd]' : 'text-primary/70'}>
            {config.mode === 'demo' ? 'DEMO DATA' : 'REAL MODE'}
          </span>}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <div className="flex items-center gap-3 text-[11.5px] text-ink-faint">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3" />
              {stats?.evidence === null || stats?.evidence === undefined ? 'evidence —' : `${stats.evidence} evidence`}
            </span>
            <span>updated {timeAgo(investigation.updated_at)}</span>
          </div>
          <span className="flex items-center gap-1 text-[12px] text-primary">
            Open <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}
