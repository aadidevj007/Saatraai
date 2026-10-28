import { cn } from '@/lib/utils';

/** Original orbital S mark: the signal point follows the upper orbital path. */
export function BrandSymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 40 40"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path d="M7.3 23.7C8.1 13.6 16.3 6 26.5 6.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M8.5 17.3c2.2 9.1 10.3 15.8 20.1 16.2" stroke="currentColor" strokeOpacity=".42" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M26.7 12.1c-2.1-1.6-5-2.1-7.7-1.4-3.3.9-5.5 3.3-5.5 6 0 3.1 3.1 4.3 7.1 5.4 4.3 1.2 7.1 2.5 7.1 5.7 0 3.1-3 5.6-7 5.9-3.1.2-6-.7-8-2.5" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30.4" cy="8.5" r="2.35" fill="#F12B45" />
      <circle cx="30.4" cy="8.5" r="4.5" fill="#F12B45" fillOpacity=".14" />
    </svg>
  );
}

export function BrandLockup({
  className,
  symbolClassName,
  wordmarkClassName,
}: {
  className?: string;
  symbolClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandSymbol className={cn('h-8 w-8 text-ink', symbolClassName)} />
      <span className={cn('display-font text-[13px] font-semibold tracking-[0.22em] text-ink', wordmarkClassName)}>
        SAATRAAI
      </span>
    </span>
  );
}
