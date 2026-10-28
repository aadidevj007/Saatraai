import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, PlugZap, SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md', className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('w-4 h-4 animate-spin text-primary', className)} aria-hidden />;
}

export function LoadingState({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-[12px] text-ink-faint">
        <Spinner className="w-3.5 h-3.5" />
        {label}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-12', i === 1 && 'h-20', i === 2 && 'h-14')} />
      ))}
    </div>
  );
}

interface StateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  tone?: 'neutral' | 'warning';
  className?: string;
}

function BaseState({ icon, title, description, action, secondaryAction, tone = 'neutral', className }: StateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl border',
          tone === 'warning' ? 'border-warning/30 bg-warning/10 text-warning' : 'border-line-strong bg-elevated text-ink-faint',
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-[13.5px] font-medium text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-dim">{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-1 flex items-center gap-2">
          {action && (
            <Button variant="primary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <BaseState {...props} icon={props.icon ?? <Inbox className="w-5 h-5" />} />;
}

export function ErrorState({
  error,
  onRetry,
  onBack,
  title = 'Something went wrong',
}: {
  error: string;
  onRetry?: () => void;
  onBack?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[13.5px] font-medium text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-md break-words text-[12.5px] text-ink-dim">{error}</p>
      </div>
      <details className="mt-1 w-full max-w-md text-left">
        <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-ink-faint hover:text-ink-dim">
          Technical details
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-line bg-void p-2 font-mono text-[11px] text-ink-dim whitespace-pre-wrap">
          {error}
        </pre>
      </details>
      <div className="mt-1 flex gap-2">
        {onRetry && (
          <Button size="sm" variant="primary" onClick={onRetry}>
            Retry
          </Button>
        )}
        {onBack && (
          <Button size="sm" variant="ghost" onClick={onBack}>
            Back
          </Button>
        )}
      </div>
    </div>
  );
}

/** Honest state for capabilities the deployment does not provide. */
export function NotConfiguredState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-elevated text-ink-faint">
        <PlugZap className="w-5 h-5" />
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-warning">Not configured</p>
        <p className="mt-1 text-[13.5px] font-medium text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-dim">{description}</p>
      </div>
      {action && (
        <Button size="sm" variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function InsufficientEvidenceState({ description }: { description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-9 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-warning/30 bg-warning/10 text-warning">
        <SearchX className="w-5 h-5" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-warning">Insufficient evidence</p>
      <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-dim">
        {description ??
          'Available evidence is insufficient to assess this question. Run executions to produce evidence records, or upload additional imagery.'}
      </p>
    </div>
  );
}
