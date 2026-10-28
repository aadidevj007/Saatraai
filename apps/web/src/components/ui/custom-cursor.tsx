'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(-40);
  const pointerY = useMotionValue(-40);
  const scaleTarget = useMotionValue(1);
  const x = useSpring(pointerX, { stiffness: 650, damping: 42, mass: 0.35 });
  const y = useSpring(pointerY, { stiffness: 650, damping: 42, mass: 0.35 });
  const scale = useSpring(scaleTarget, { stiffness: 420, damping: 28, mass: 0.3 });

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setEnabled(media.matches && !reducedMotion);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [reducedMotion]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add('has-custom-cursor');

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
      const interactive = (event.target as Element | null)?.closest(
        'a,button,[role="button"],[role="switch"],input,textarea,select,[data-cursor="interactive"]',
      );
      scaleTarget.set(interactive ? 1.35 : 1);
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') scaleTarget.set(0.78);
    };
    const onUp = () => scaleTarget.set(1);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      root.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [enabled, pointerX, pointerY, scaleTarget]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="custom-cursor pointer-events-none fixed left-0 top-0 z-[100] grid h-8 w-8 place-items-center rounded-full border border-primary/75 bg-primary/[0.04]"
      style={{ x, y, scale, marginLeft: -16, marginTop: -16 }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(241,43,69,0.8)]" />
    </motion.div>
  );
}
