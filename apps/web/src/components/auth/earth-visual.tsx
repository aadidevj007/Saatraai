'use client';

/** Dark Earth visual: WebGL globe with telemetry overlay. */

import dynamic from 'next/dynamic';

import { cn } from '@/lib/utils';

const EarthGlobe = dynamic(
  () => import('@/components/three/earth-globe').then((m) => m.EarthGlobe),
  { ssr: false },
);

export function EarthVisual({ className }: { className?: string }) {
  return (
    <div className={cn('pointer-events-none relative aspect-square w-full max-w-[520px]', className)} aria-hidden>
      {/* soft field behind the globe */}
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(34,211,238,0.10),rgba(59,130,246,0.05)_45%,transparent_70%)]" />

      <EarthGlobe
        satellites={2}
        className="absolute inset-0"
      />

      {/* telemetry corners */}
      <div className="absolute left-0 top-[6%] space-y-1">
        <TelemetryLine label="SENSOR" value="SAR + OPTICAL" />
        <TelemetryLine label="PASS" value="DESCENDING" />
      </div>
      <div className="absolute right-0 bottom-[6%] space-y-1 text-right">
        <TelemetryLine label="GSD" value="10 m" align="end" />
        <TelemetryLine label="REVISIT" value="6 days" align="end" />
      </div>
    </div>
  );
}

function TelemetryLine({ label, value, align = 'start' }: { label: string; value: string; align?: 'start' | 'end' }) {
  return (
    <div className={align === 'end' ? 'text-right' : ''}>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint">{label} </span>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-primary/80">{value}</span>
    </div>
  );
}
