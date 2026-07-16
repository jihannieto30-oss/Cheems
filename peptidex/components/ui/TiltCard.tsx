'use client';

import { useRef, ReactNode, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Props {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
}

/**
 * 3D tilt + lift card with a moving specular glare. Used for product /
 * science surfaces so they feel like physical objects, not shop cards.
 */
export default function TiltCard({
  children,
  className = '',
  intensity = 8,
  glare = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rx = useSpring(useTransform(my, [0, 1], [intensity, -intensity]), {
    stiffness: 180,
    damping: 20,
  });
  const ry = useSpring(useTransform(mx, [0, 1], [-intensity, intensity]), {
    stiffness: 180,
    damping: 20,
  });

  const glareX = useTransform(mx, [0, 1], ['0%', '100%']);
  const glareY = useTransform(my, [0, 1], ['0%', '100%']);
  const glareBg = useTransform(
    [glareX, glareY] as const,
    ([gx, gy]: string[]) =>
      `radial-gradient(600px circle at ${gx} ${gy}, rgba(255,255,255,0.55), transparent 40%)`
  );

  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };

  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className={`relative [transform-style:preserve-3d] ${className}`}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: glareBg,
            mixBlendMode: 'overlay',
          }}
        />
      )}
    </motion.div>
  );
}
