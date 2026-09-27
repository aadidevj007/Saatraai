'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/* ── Tabs ── */

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1 border-b border-line', className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px px-3 py-2 text-[12.5px] font-medium transition-colors',
              active ? 'text-primary' : 'text-ink-dim hover:text-ink',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className="ml-1.5 font-mono text-[10px] text-ink-faint">{tab.count}</span>
            )}
            {active && <span className="absolute inset-x-2 -bottom-px h-px bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

/* ── Tooltip ── */

export function Tooltip({ label, children, side = 'right' }: { label: string; children: ReactNode; side?: 'right' | 'top' | 'bottom' }) {
  const [visible, setVisible] = useState(false);
  const position =
    side === 'right'
      ? 'left-full top-1/2 -translate-y-1/2 ml-2'
      : side === 'top'
        ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
        : 'top-full left-1/2 -translate-x-1/2 mt-2';

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.span
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-line-strong bg-elevated px-2 py-1 text-[11px] text-ink shadow-lg',
              position,
            )}
            role="tooltip"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ── Dropdown menu ── */

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export function Dropdown({
  trigger,
  items,
  align = 'end',
  ariaLabel = 'Menu',
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
      >
        {trigger}
        <ChevronDown className={cn('h-3.5 w-3.5 text-ink-faint transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className={cn(
              'absolute z-50 mt-1.5 min-w-48 overflow-hidden rounded-lg border border-line-strong bg-elevated py-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]',
              align === 'end' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item) => (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors disabled:opacity-40',
                  item.danger ? 'text-danger hover:bg-danger/10' : 'text-ink-dim hover:bg-card hover:text-ink',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Metric tile ── */

export function Metric({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
  icon?: ReactNode;
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'success'
        ? 'text-success'
        : tone === 'warning'
          ? 'text-warning'
          : tone === 'danger'
            ? 'text-danger'
            : 'text-ink';
  return (
    <div className="rounded-lg border border-line bg-card px-3.5 py-3 transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-ink-faint">{label}</span>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <div className={cn('mt-1.5 font-mono text-[22px] leading-none font-medium', toneClass)}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-ink-faint">{hint}</div>}
    </div>
  );
}

/* ── Confidence ring ── */

export function ConfidenceRing({
  value,
  size = 96,
  label = 'Confidence',
  sublabel,
}: {
  value: number; // 0..1
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const stroke = Math.max(4, Math.round(size / 16));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value));
  const tone = clamped >= 0.7 ? '#34d399' : clamped >= 0.4 ? '#22d3ee' : clamped > 0 ? '#f59e0b' : '#5d7086';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${(clamped * 100).toFixed(0)}%`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#16212e" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[18px] font-semibold" style={{ color: tone }}>
            {(clamped * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.11em] text-ink-faint">{label}</span>
      {sublabel && <span className="text-[11px] text-ink-faint">{sublabel}</span>}
    </div>
  );
}

/* ── Progress bar ── */

export function ProgressBar({
  value,
  tone = 'primary',
  className,
  height = 6,
}: {
  value: number; // 0..1
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
  height?: number;
}) {
  const color =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'danger'
          ? 'bg-danger'
          : tone === 'accent'
            ? 'bg-accent'
            : 'bg-primary';
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-[#16212e]', className)} style={{ height }}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

/* ── Section header ── */

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-dim">{title}</h2>
        {description && <p className="mt-1 text-[12.5px] text-ink-faint">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Panel ── */

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  scroll,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  scroll?: boolean;
}) {
  return (
    <section className={cn('rounded-xl border border-line bg-surface', className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-dim">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11.5px] text-ink-faint">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={cn(scroll ? 'overflow-y-auto' : '', bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  );
}
