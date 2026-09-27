'use client';

/** Dark Earth visual: graticule globe, orbit path, satellite pass, telemetry ticks. */

import { cn } from '@/lib/utils';

export function EarthVisual({ className }: { className?: string }) {
  const meridians = [0, 1, 2, 3];
  const parallels = [0, 1, 2];

  return (
    <div className={cn('pointer-events-none relative aspect-square w-full max-w-[520px]', className)} aria-hidden>
      {/* soft field */}
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(34,211,238,0.10),rgba(59,130,246,0.05)_45%,transparent_70%)]" />

      <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '48s' }}>
        <svg viewBox="0 0 400 400" className="h-full w-full">
          <defs>
            <radialGradient id="globe" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#0f2233" />
              <stop offset="55%" stopColor="#0a1521" />
              <stop offset="100%" stopColor="#060d15" />
            </radialGradient>
            <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
              <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.15" />
            </linearGradient>
            <clipPath id="globeClip">
              <circle cx="200" cy="200" r="128" />
            </clipPath>
          </defs>

          {/* orbit ellipse */}
          <ellipse
            cx="200"
            cy="200"
            rx="176"
            ry="66"
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.28"
            strokeWidth="1"
            strokeDasharray="4 6"
            transform="rotate(-18 200 200)"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="158"
            ry="150"
            fill="none"
            stroke="#3b82f6"
            strokeOpacity="0.14"
            strokeWidth="1"
            transform="rotate(24 200 200)"
          />

          {/* globe */}
          <circle cx="200" cy="200" r="128" fill="url(#globe)" stroke="url(#rim)" strokeWidth="1.5" />

          <g clipPath="url(#globeClip)" stroke="#22d3ee" strokeOpacity="0.16" fill="none">
            {meridians.map((i) => (
              <ellipse key={`m-${i}`} cx="200" cy="200" rx={30 + i * 32} ry="128" />
            ))}
            {parallels.map((i) => (
              <ellipse key={`p-${i}`} cx="200" cy="200" rx="128" ry={34 + i * 46} />
            ))}
          </g>

          {/* sampling grid inside globe */}
          <g clipPath="url(#globeClip)" fill="#22d3ee" fillOpacity="0.35">
            {Array.from({ length: 7 }).map((_, row) =>
              Array.from({ length: 7 }).map((_, col) => (
                <circle key={`${row}-${col}`} cx={92 + col * 36} cy={96 + row * 36} r="1.1" />
              )),
            )}
          </g>

          {/* scan sweep line across globe */}
          <g clipPath="url(#globeClip)">
            <rect x="72" y="200" width="256" height="1.6" fill="#22d3ee" fillOpacity="0.65">
              <animate attributeName="y" values="74;326;74" dur="7s" repeatCount="indefinite" />
            </rect>
            <rect x="72" y="200" width="256" height="14" fill="#22d3ee" fillOpacity="0.06">
              <animate attributeName="y" values="60;312;60" dur="7s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* satellite on orbit */}
          <g transform="rotate(-18 200 200)">
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 200 200"
                to="360 200 200"
                dur="16s"
                repeatCount="indefinite"
              />
              <g transform="translate(376 200)">
                <rect x="-5" y="-3" width="10" height="6" rx="1" fill="#e6f1fa" />
                <rect x="-14" y="-1.5" width="8" height="3" fill="#22d3ee" />
                <rect x="6" y="-1.5" width="8" height="3" fill="#22d3ee" />
                <circle r="9" fill="none" stroke="#22d3ee" strokeOpacity="0.5" strokeWidth="0.8">
                  <animate attributeName="r" values="6;16;6" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
                </circle>
              </g>
            </g>
          </g>
        </svg>
      </div>

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
