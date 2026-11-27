'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * SAATRAAI emblem: monochrome silver-obsidian globe framed by a crimson
 * targeting reticle and a tilted orbital swoosh with glowing satellite beacon.
 */
export function BrandSymbol({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const globeId = `${uid}-globe`;
  const landId = `${uid}-land`;
  const swooshId = `${uid}-swoosh`;
  const beaconId = `${uid}-beacon`;
  const clipId = `${uid}-clip`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <defs>
        <radialGradient id={globeId} cx="36%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#4a4d57" />
          <stop offset="48%" stopColor="#16181e" />
          <stop offset="100%" stopColor="#07080a" />
        </radialGradient>
        <linearGradient id={landId} x1="20%" y1="15%" x2="80%" y2="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d4d7df" />
          <stop offset="100%" stopColor="#8b909c" />
        </linearGradient>
        <linearGradient id={swooshId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#680404" />
          <stop offset="45%" stopColor="#c40c0c" />
          <stop offset="78%" stopColor="#e61919" />
          <stop offset="100%" stopColor="#6d0505" />
        </linearGradient>
        <radialGradient id={beaconId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="32%" stopColor="#ff4d4d" />
          <stop offset="65%" stopColor="#d10909" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#b00000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="16.5" />
        </clipPath>
      </defs>

      {/* Outer crimson targeting reticle ring (broken for crosshairs) */}
      <path
        d="M 11.6 27 A 21 21 0 0 1 27 11.6 M 37 11.6 A 21 21 0 0 1 52.4 27 M 52.4 37 A 21 21 0 0 1 37 52.4 M 27 52.4 A 21 21 0 0 1 11.6 37"
        stroke="#8d0b0b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Cardinal crosshair ticks */}
      <path
        d="M32 4.5V12.5 M32 51.5V59.5 M4.5 32H12.5 M51.5 32H59.5"
        stroke="#750909"
        strokeWidth="2.1"
        strokeLinecap="round"
      />

      {/* Back half of tilted orbital arc */}
      <path
        d="M 8 46.5 C 5.5 41.5, 16 28, 32 19 C 47.5 10.5, 57.5 12, 56 17.5"
        stroke="#590404"
        strokeWidth="1.4"
        strokeOpacity="0.65"
        fill="none"
      />

      {/* Globe sphere */}
      <circle cx="32" cy="32" r="16.5" fill={`url(#${globeId})`} stroke="#d4d7df" strokeWidth="0.9" />

      {/* Clipped continents & subtle lat/lon grid */}
      <g clipPath={`url(#${clipId})`}>
        {/* Subtle graticule */}
        <ellipse cx="32" cy="32" rx="8.5" ry="16.5" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.6" />
        <path d="M15.5 26.5H48.5 M15.5 37.5H48.5" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.6" />

        {/* Stylized Eurasia / Africa / India / Australia landmasses */}
        <path
          d="M17.5 23.5 C19.5 19.5, 24.5 16.5, 31 16.5 C36.5 16.5, 42.5 19, 44.5 22.5 C43.5 25, 40.5 26, 38.5 25 C37 26.5, 36.5 29, 34.5 31 C33.5 31, 32.5 29, 31.5 27 C30 27.5, 28.5 27, 27.5 25.5 C26.5 27.5, 28 31, 27 34 C25.5 37.5, 23 39.5, 21.5 38 C20 35.5, 20.5 31.5, 19.5 29.5 C18 28.5, 16.8 26, 17.5 23.5 Z"
          fill={`url(#${landId})`}
        />
        {/* SE Asia / Indonesia & Australia */}
        <path
          d="M38.5 33.5 C40 32.5, 42 33, 43 34.5 C41.5 35.5, 39.5 35, 38.5 33.5 Z M39.5 38.5 C42 37.5, 45.5 38.5, 46 41.5 C46 43.5, 43.5 45, 41 44.5 C39 44, 38 40.5, 39.5 38.5 Z"
          fill={`url(#${landId})`}
        />
        {/* Specular left rim highlight */}
        <path
          d="M 18.5 22.5 A 15 15 0 0 0 18.5 41.5"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>

      {/* Foreground dynamic tilted orbital swoosh */}
      <path
        d="M 7.5 47 C 13 44.5, 24.5 38.5, 36 31 C 46.5 24, 54 17.5, 57.5 13.5 C 58.2 15.2, 54.5 20.5, 43.5 28.5 C 31.5 37.2, 16.5 45, 7.5 47 Z"
        fill={`url(#${swooshId})`}
      />
      <path
        d="M 9.5 46 C 19 41.5, 34 32.5, 48 22.5"
        stroke="#ff6b6b"
        strokeOpacity="0.45"
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* Glowing crimson satellite beacon on upper-right orbit */}
      <circle cx="48.5" cy="21" r="6.5" fill={`url(#${beaconId})`} />
      <circle cx="48.5" cy="21" r="2.6" fill="#d90b0b" stroke="#ffffff" strokeWidth="0.75" />
      <circle cx="48.5" cy="21" r="1.2" fill="#ffffff" />
    </svg>
  );
}

/**
 * Custom geometric SAATRAAI wordmark with metallic bevelled letters,
 * crimson triangular inner A-accents, and angled crimson I-dot.
 */
export function BrandWordmark({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const metalId = `${uid}-metal`;
  const redId = `${uid}-red`;
  const shadowId = `${uid}-shadow`;

  return (
    <span className={cn('inline-flex flex-col', className)}>
      <svg
        viewBox={showTagline ? '0 0 430 62' : '0 0 430 44'}
        fill="none"
        className="h-[1.35em] w-auto overflow-visible"
        aria-label="SAATRAAI"
      >
        <defs>
          <linearGradient id={metalId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="52%" stopColor="#e4e7ee" />
            <stop offset="100%" stopColor="#a7adb9" />
          </linearGradient>
          <linearGradient id={redId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef1616" />
            <stop offset="100%" stopColor="#8b0000" />
          </linearGradient>
          <filter id={shadowId} x="-5%" y="-10%" width="110%" height="130%">
            <feDropShadow dx="0" dy="1.4" stdDeviation="1.1" floodColor="#0b0c10" floodOpacity="0.45" />
          </filter>
        </defs>

        <g filter={`url(#${shadowId})`} stroke="#2b2e37" strokeWidth="1.05" strokeLinejoin="round">
          {/* S */}
          <path
            d="M 44 6 H 13 C 6.5 6 3 9.5 3 14.5 C 3 19.5 6.5 22.8 13 22.8 H 33 C 36.2 22.8 38 24.4 38 27 C 38 29.6 36.2 31.2 33 31.2 H 4 L 2 38 H 35 C 42 38 46 34 46 27.8 C 46 21.8 42 18.2 35 18.2 H 14.5 C 11.5 18.2 10 16.8 10 14.8 C 10 12.8 11.5 11.6 14.5 11.6 H 41.5 L 44 6 Z"
            fill={`url(#${metalId})`}
          />

          {/* A (1) */}
          <path d="M 52 38 L 70 6 H 82 L 100 38 H 91 L 76 12 L 61 38 Z" fill={`url(#${metalId})`} />
          <polygon points="76,22 68,38 84,38" fill={`url(#${redId})`} stroke="none" />

          {/* A (2) */}
          <path d="M 106 38 L 124 6 H 136 L 154 38 H 145 L 130 12 L 115 38 Z" fill={`url(#${metalId})`} />
          <polygon points="130,22 122,38 138,38" fill={`url(#${redId})`} stroke="none" />

          {/* T */}
          <path d="M 157 6 H 203 L 201 12.5 H 184 V 38 H 176 V 12.5 H 159 Z" fill={`url(#${metalId})`} />

          {/* R */}
          <path
            d="M 210 38 V 6 H 242 C 250 6 254.5 10 254.5 16.5 C 254.5 22.5 250 26.2 242 26.5 L 256 38 H 245 L 232 26.8 H 218 V 38 Z M 218 20.5 H 240.5 C 244.5 20.5 246.5 18.8 246.5 16.2 C 246.5 13.5 244.5 12 240.5 12 H 218 Z"
            fill={`url(#${metalId})`}
          />

          {/* A (3) */}
          <path d="M 260 38 L 278 6 H 290 L 308 38 H 299 L 284 12 L 269 38 Z" fill={`url(#${metalId})`} />
          <polygon points="284,22 276,38 292,38" fill={`url(#${redId})`} stroke="none" />

          {/* A (4) */}
          <path d="M 314 38 L 332 6 H 344 L 362 38 H 353 L 338 12 L 323 38 Z" fill={`url(#${metalId})`} />
          <polygon points="338,22 330,38 346,38" fill={`url(#${redId})`} stroke="none" />

          {/* I (stem + crimson angled top cap) */}
          <path d="M 372 14 H 382 V 38 H 372 Z" fill={`url(#${metalId})`} />
          <polygon points="372,9.5 382,6 382,11.5 372,11.5" fill={`url(#${redId})`} stroke="none" />
        </g>

        {showTagline && (
          <g>
            <line x1="6" y1="54" x2="54" y2="54" stroke="#9ca3af" strokeWidth="1" />
            <text
              x="215"
              y="57.5"
              textAnchor="middle"
              fill="#52525b"
              fontSize="10"
              fontFamily="Space Grotesk, Inter, sans-serif"
              fontWeight="600"
              letterSpacing="5.2"
            >
              EARTH OBSERVATION INTELLIGENCE
            </text>
            <line x1="376" y1="54" x2="424" y2="54" stroke="#9ca3af" strokeWidth="1" />
          </g>
        )}
      </svg>
    </span>
  );
}

export function BrandLockup({
  className,
  symbolClassName,
  wordmarkClassName,
  showTagline = false,
}: {
  className?: string;
  symbolClassName?: string;
  wordmarkClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandSymbol className={cn('h-9 w-9', symbolClassName)} />
      <BrandWordmark
        showTagline={showTagline}
        className={cn('text-[14px] leading-none', wordmarkClassName)}
      />
    </span>
  );
}
