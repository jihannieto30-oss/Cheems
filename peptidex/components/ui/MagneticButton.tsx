'use client';

import { useRef, ReactNode, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
  as?: 'button' | 'a';
  href?: string;
  ariaLabel?: string;
}

/**
 * A button that magnetically drifts toward the cursor, with an inner
 * label that lags slightly for depth. Core luxury microinteraction.
 */
export default function MagneticButton({
  children,
  onClick,
  className = '',
  strength = 0.35,
  as = 'button',
  href,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ix = useMotionValue(0);
  const iy = useMotionValue(0);

  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const six = useSpring(ix, { stiffness: 260, damping: 20, mass: 0.4 });
  const siy = useSpring(iy, { stiffness: 260, damping: 20, mass: 0.4 });

  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * strength);
    y.set(relY * strength);
    ix.set(relX * strength * 0.35);
    iy.set(relY * strength * 0.35);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
    ix.set(0);
    iy.set(0);
  };

  const Inner = (
    <motion.span style={{ x: six, y: siy }} className="inline-flex">
      {children}
    </motion.span>
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className="inline-flex"
    >
      {as === 'a' ? (
        <a
          href={href}
          aria-label={ariaLabel}
          className={className}
          onClick={onClick}
        >
          {Inner}
        </a>
      ) : (
        <button
          type="button"
          aria-label={ariaLabel}
          className={className}
          onClick={onClick}
        >
          {Inner}
        </button>
      )}
    </motion.div>
  );
}
