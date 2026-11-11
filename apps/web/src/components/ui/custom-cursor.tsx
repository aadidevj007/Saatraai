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
    let hoverScale = 1;
    let pressed = false;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
      const interactive = (event.target as Element | null)?.closest(
        'a,button,[role="button"],[role="switch"],input,textarea,select,[data-cursor="interactive"]',
      );
      hoverScale = interactive ? 1.08 : 1;
      if (!pressed) scaleTarget.set(hoverScale);
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        pressed = true;
        scaleTarget.set(0.94);
      }
    };
    const onUp = () => {
      pressed = false;
      scaleTarget.set(hoverScale);
    };

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
      className="custom-cursor pointer-events-none fixed left-0 top-0 z-[100]"
      style={{ x, y, scale, marginLeft: -2, marginTop: -2 }}
    >
      <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
        <path
          d="M2.2 1.5 2.15 21.2l5.1-4.45 4.7 9.15 4.1-2.1-4.75-9.05 7.05-.55L2.2 1.5Z"
          fill="#f4f8ff"
          stroke="#07101c"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="m4.1 5.1 10.1 8.3-4.7.35 4.35 8.25-1.3.65-4.3-8.35-3.55 3.05L4.1 5.1Z"
          fill="#f4f8ff"
        />
      </svg>
    </motion.div>
  );
}
