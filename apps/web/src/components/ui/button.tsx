'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-[#04222b] hover:bg-[#4be0f5] active:bg-[#1cbcd8] font-semibold shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_6px_20px_rgba(34,211,238,0.14)]',
  secondary:
    'bg-elevated text-ink border border-line-strong hover:border-primary/50 hover:text-primary transition-colors',
  outline:
    'border border-line-strong text-ink-dim hover:text-ink hover:border-ink-faint transition-colors',
  ghost: 'text-ink-dim hover:text-ink hover:bg-elevated transition-colors',
  danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25 transition-colors',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[12px] rounded-md gap-1.5',
  md: 'h-9 px-4 text-[13px] rounded-lg gap-2',
  lg: 'h-11 px-6 text-[14px] rounded-lg gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading, icon, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap select-none transition-all',
        'disabled:opacity-45 disabled:pointer-events-none',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
}

export function IconButton({ label, children, active, className, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors',
        'text-ink-dim hover:text-ink hover:bg-elevated',
        'focus-visible:outline-2 focus-visible:outline-primary',
        active && 'bg-elevated text-primary',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
