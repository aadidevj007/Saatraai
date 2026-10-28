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
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(241,43,69,0.14),rgba(241,43,69,0.04)_48%,transparent_70%)]" />

      <EarthGlobe
        satellites={2}
        className="absolute inset-0"
      />

      {/* These labels describe the illustration; no live collection or sensor metadata is shown. */}
      <div className="absolute left-0 top-[6%] space-y-1">
        <TelemetryLine label="GLOBE" value="PROCEDURAL" />
        <TelemetryLine label="MARKERS" value="DECORATIVE" />
      </div>
      <div className="absolute right-0 bottom-[6%] space-y-1 text-right">
        <TelemetryLine label="OBSERVATIONS" value="NONE" align="end" />
        <TelemetryLine label="STATUS" value="ILLUSTRATION" align="end" />
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
