'use client';

import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
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
    'bg-[#0b0c10] text-white hover:bg-[#232530] active:scale-[0.98] font-medium shadow-[0_10px_24px_rgba(11,12,16,0.18)]',
  secondary:
    'glass-option text-ink hover:text-primary active:scale-[0.98] font-medium',
  outline:
    'border border-line-strong bg-white/75 text-ink hover:border-[#0b0c10] hover:bg-white backdrop-blur-md active:scale-[0.98]',
  ghost: 'text-ink-dim hover:text-ink hover:bg-black/[0.05] active:scale-[0.98]',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/15 active:scale-[0.98]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px] rounded-lg gap-1.5',
  md: 'h-9 px-4 text-[13px] rounded-xl gap-2',
  lg: 'h-11 px-6 text-[14px] rounded-xl gap-2',
};

function buttonClassName(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    'inline-flex items-center justify-center whitespace-nowrap select-none transition-all',
    'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', loading, icon, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonClassName(variant, size, className), 'disabled:opacity-45 disabled:pointer-events-none')}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

/** A navigation link styled like a button, retaining native link semantics. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { href, className, variant = 'secondary', size = 'md', icon, children, ...rest },
  ref,
) {
  return (
    <Link ref={ref} href={href} className={buttonClassName(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
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
        'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all',
        'text-ink-dim hover:text-ink hover:bg-black/[0.06]',
        'focus-visible:outline-2 focus-visible:outline-primary',
        active && 'glass-option-active text-white',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
