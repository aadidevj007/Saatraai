'use client';

/** Interactive timeline rail — real events grouped by year. */

import { useMemo } from 'react';
import { CalendarRange, Database, FileSearch, HelpCircle, Radio, Zap } from 'lucide-react';

import type { TimelineEvent, TimelineEventKind } from '@/lib/analysis/timeline';
import { cn, formatDate } from '@/lib/utils';

const KIND_STYLE: Record<TimelineEventKind, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  query: { color: '#22d3ee', icon: HelpCircle },
  image: { color: '#2dd4bf', icon: Database },
  execution: { color: '#3b82f6', icon: Radio },
  evidence: { color: '#f59e0b', icon: FileSearch },
  hypothesis: { color: '#a78bfa', icon: Zap },
  conclusion: { color: '#34d399', icon: CalendarRange },
  demo: { color: '#c4b5fd', icon: Zap },
};

export function TimelineRail({
  events,
  selectedId,
  onSelect,
  range,
}: {
  events: TimelineEvent[];
  selectedId: string | null;
  onSelect: (event: TimelineEvent) => void;
  range?: { start: string; end: string };
}) {
  const years = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const event of events) {
      const year = event.date.slice(0, 4) || '—';
      const list = map.get(year) ?? [];
      list.push(event);
      map.set(year, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-[12px] text-ink-faint">
        No timeline events yet — events appear as queries, scenes, executions and evidence are recorded.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          <CalendarRange className="h-3 w-3" /> Temporal timeline
        </span>
        <span className="font-mono text-[10px] text-ink-faint">
          {range ? `${range.start} → ${range.end}` : 'range not set'} · {events.length} events
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto px-4 py-2">
        {years.map(([year, yearEvents]) => (
          <div key={year} className="flex shrink-0 flex-col">
            <div className="mb-1 font-mono text-[10.5px] font-semibold tracking-wider text-ink-dim">{year}</div>
            <div className="flex max-h-full flex-wrap gap-1.5">
              {yearEvents.map((event) => {
                const style = KIND_STYLE[event.kind] ?? KIND_STYLE.evidence;
                const Icon = style.icon;
                const active = selectedId === event.id;
                return (
                  <button
                    key={event.id}
                    onClick={() => onSelect(event)}
                    title={`${formatDate(event.date)} · ${event.title}\n${event.description}`}
                    className={cn(
                      'flex max-w-56 items-center gap-1.5 rounded-md border px-2 py-1 text-left transition-colors',
                      active ? 'border-primary/60 bg-primary/10' : 'border-line bg-card hover:border-line-strong',
                    )}
                  >
                    <Icon className="h-3 w-3 shrink-0" style={{ color: style.color }} />
                    <span className="truncate text-[11px] text-ink-dim">{event.title}</span>
                    {event.demo && <span className="font-mono text-[8.5px] text-[#c4b5fd]">DEMO</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
