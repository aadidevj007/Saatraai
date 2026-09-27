'use client';

/** Motion primitives: 3D tilt cards, spotlight hover, scroll reveal. */

import { useRef, useState, type ReactNode, type CSSProperties, type PointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

import { cn } from '@/lib/utils';

/**
 * 3D tilt card — pointer-tracked rotateX/rotateY with spring physics,
 * plus a moving specular highlight. Static (no tilt) on touch devices.
 */
export function TiltCard({
  children,
  className,
  maxTilt = 8,
  glare = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const [hover, setHover] = useState(false);

  const rX = useSpring(useTransform(my, [0, 1], [maxTilt, -maxTilt]), { stiffness: 220, damping: 18 });
  const rY = useSpring(useTransform(mx, [0, 1], [-maxTilt, maxTilt]), { stiffness: 220, damping: 18 });

  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glareBg = useTransform(
    [gx, gy],
    ([x, y]) =>
      `radial-gradient(420px circle at ${x} ${y}, rgba(34,211,238,0.10), transparent 65%)`,
  );

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch') return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        mx.set(0.5);
        my.set(0.5);
      }}
      style={{
        transformPerspective: 900,
        rotateX: rX,
        rotateY: rY,
        ...style,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={cn('relative will-change-transform', className)}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glareBg, opacity: hover ? 1 : 0 }}
        />
      )}
    </motion.div>
  );
}

/** Simple scroll-reveal wrapper used across pages. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Magnetic hover wrapper — subtle translate toward the pointer. */
export function Magnetic({ children, strength = 6 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 300, damping: 20 });
  const y = useSpring(0, { stiffness: 300, damping: 20 });

  return (
    <motion.div
      ref={ref}
      style={{ x, y, display: 'inline-block' }}
      onPointerMove={(e) => {
        if (e.pointerType === 'touch') return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(((e.clientX - rect.left) / rect.width - 0.5) * strength * 2);
        y.set(((e.clientY - rect.top) / rect.height - 0.5) * strength * 2);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
