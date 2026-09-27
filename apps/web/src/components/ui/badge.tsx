import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'demo';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-elevated text-ink-dim border-line-strong',
  primary: 'bg-primary/10 text-primary border-primary/30',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  accent: 'bg-accent/10 text-accent border-accent/30',
  demo: 'bg-[#7c3aed]/15 text-[#c4b5fd] border-[#7c3aed]/40',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...rest
}: { tone?: BadgeTone; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-[1px] font-mono text-[10px] font-medium uppercase tracking-[0.09em]',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

const DOT_STATES = {
  online: 'bg-success',
  offline: 'bg-danger',
  degraded: 'bg-warning',
  not_configured: 'bg-ink-faint',
  unknown: 'bg-ink-faint',
  running: 'bg-primary animate-pulse-soft',
} as const;

export function StatusDot({
  state,
  className,
}: {
  state: keyof typeof DOT_STATES;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', DOT_STATES[state], className)}
      aria-hidden
    />
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-elevated px-1 font-mono text-[10px] text-ink-dim">
      {children}
    </kbd>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] text-ink-dim',
        className,
      )}
    >
      {children}
    </span>
  );
}
