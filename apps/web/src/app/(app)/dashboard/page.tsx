'use client';

/** Dashboard — clean, human research desk with quick question launch. */

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Compass, Plus, Sparkles, Telescope, Zap } from 'lucide-react';

import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Input,
  Reveal,
  Skeleton,
  TiltCard,
} from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { errorMessage } from '@/lib/api';
import type { Investigation } from '@/lib/api/types';
import { useInvestigations, useInvestigationSummaries } from '@/lib/hooks/queries';
import { getInvestigationConfig } from '@/lib/investigation-config';
import { usePageTitle } from '@/components/shell/shell-context';
import { greeting, timeAgo } from '@/lib/utils';

const STATUS_META = {
  planned: { label: 'Planned', tone: 'neutral' },
  running: { label: 'In progress', tone: 'primary' },
  complete: { label: 'Complete', tone: 'success' },
  blocked: { label: 'Needs attention', tone: 'danger' },
} as const;

const QUICK_PROMPTS = [
  'Why has flooding increased in Kerala between 2022 and 2026?',
  'How has urban growth changed in Chennai since 2019?',
  'What changed in the Sundarbans after the cyclone?',
];

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const router = useRouter();
  const { user, google, preferences } = useAuth();
  const [quickQuestion, setQuickQuestion] = useState('');

  const fullName = google?.name ?? user?.display_name ?? user?.email ?? 'there';
  const firstName = fullName.split(/[@\s]+/)[0] || fullName;

  const investigationsQuery = useInvestigations({ page: 1, page_size: 20 });
  const { stats, isLoading: summariesLoading } = useInvestigationSummaries(
    investigationsQuery.data?.items,
    10,
  );

  const items = useMemo(() => investigationsQuery.data?.items ?? [], [investigationsQuery.data]);
  const total = investigationsQuery.data?.total ?? 0;

  const counts = useMemo(() => {
    const active = items.filter((i) => i.status === 'planned' || i.status === 'running').length;
    const completed = items.filter((i) => i.status === 'complete').length;
    let evidence = 0;
    for (const [, value] of stats) {
      if (value.evidence !== null) evidence += value.evidence;
    }
    return { active, completed, evidence };
  }, [items, stats]);

  const handleQuickStart = (e: FormEvent) => {
    e.preventDefault();
    const q = quickQuestion.trim();
    router.push(q ? `/investigations/new?q=${encodeURIComponent(q)}` : '/investigations/new');
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Welcome & Quick Ask */}
      <div className="glass-surface rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium text-ink-faint">
              {greeting()}, {firstName}
              {preferences?.research_interest ? ` · ${preferences.research_interest}` : ''}
            </p>
            <h1 className="display-font mt-1.5 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
              What would you like to look into?
            </h1>
          </div>
          <ButtonLink href="/investigations" variant="secondary" size="sm" icon={<Telescope className="h-3.5 w-3.5" />}>
            All investigations
          </ButtonLink>
        </div>

        <form onSubmit={handleQuickStart} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Input
            value={quickQuestion}
            onChange={(e) => setQuickQuestion(e.target.value)}
            placeholder="Ask a question about any place on Earth…"
            aria-label="Ask a question"
            className="h-11 flex-1 rounded-xl px-4 text-[14px]"
          />
          <Button type="submit" variant="primary" size="lg" icon={<Plus className="h-4 w-4" />}>
            Start investigation
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11.5px] text-ink-faint">
            <Sparkles className="h-3 w-3" /> Try:
          </span>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => router.push(`/investigations/new?q=${encodeURIComponent(prompt)}`)}
              className="glass-option rounded-full px-3 py-1 text-[12px] text-ink-dim hover:text-ink"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Compact stats */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            key: 'active',
            label: 'Open',
            value: investigationsQuery.isPending ? <Skeleton className="h-6 w-10" /> : counts.active,
            hint: `${total} total saved`,
            icon: Compass,
          },
          {
            key: 'completed',
            label: 'Completed',
            value: investigationsQuery.isPending ? <Skeleton className="h-6 w-10" /> : counts.completed,
            hint: 'Finished runs',
            icon: CheckCircle2,
          },
          {
            key: 'evidence',
            label: 'Evidence items',
            value: summariesLoading ? <Skeleton className="h-6 w-10" /> : counts.evidence,
            hint: 'Across recent work',
            icon: Zap,
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Reveal key={stat.key} delay={i * 0.05}>
              <div className="glass-option rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between text-[12px] text-ink-faint">
                  <span>{stat.label}</span>
                  <Icon className="h-4 w-4 text-ink-faint" />
                </div>
                <div className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink">{stat.value}</div>
                <div className="mt-0.5 text-[11.5px] text-ink-faint">{stat.hint}</div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* API error */}
      {investigationsQuery.isError && (
        <div className="mt-6">
          <ErrorState
            error={errorMessage(investigationsQuery.error)}
            title="Couldn’t load your investigations"
            onRetry={() => investigationsQuery.refetch()}
          />
        </div>
      )}

      {/* Recent investigations */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-ink">Recent investigations</h2>
          {items.length > 0 && (
            <Link href="/investigations" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-dim hover:text-ink">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="mt-4">
          {investigationsQuery.isPending ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-line bg-white/80 p-5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-4 h-5 w-24" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Telescope className="w-5 h-5" />}
              title="No investigations yet"
              description="Ask a question above or pick one of the examples to open your first workspace."
              action={{
                label: 'New investigation',
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
  const statusInfo = STATUS_META[investigation.status] ?? STATUS_META.planned;

  return (
    <TiltCard maxTilt={4} className="rounded-2xl">
      <Link
        href={`/investigations/${investigation.id}`}
        className="card block p-5 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-ink">{investigation.title}</h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-dim">
              {config?.question ?? serverQuestion ?? 'Open to view questions and scenes.'}
            </p>
          </div>
          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-dim">
          {(config?.region.name ?? serverRegion) && (
            <span className="rounded-md bg-elevated px-2 py-0.5">{config?.region.name ?? serverRegion}</span>
          )}
          {config && (
            <span className="rounded-md bg-elevated px-2 py-0.5 font-mono text-[11px]">
              {config.timeRange.start} → {config.timeRange.end}
            </span>
          )}
          {config?.mode === 'demo' && <Badge tone="demo">Sample demo</Badge>}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12px] text-ink-faint">
          <span>
            {stats?.evidence ? `${stats.evidence} evidence · ` : ''}
            Updated {timeAgo(investigation.updated_at)}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-ink">
            Open <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </TiltCard>
  );
}
