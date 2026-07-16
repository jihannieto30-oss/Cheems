'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const line =
  'We do not chase trends. We engineer certainty — molecule by molecule, batch by batch, beyond the point where others call it perfect.';

export default function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.35'],
  });
  const words = line.split(' ');

  return (
    <section ref={ref} className="bg-paper px-6 py-40">
      <div className="mx-auto max-w-5xl">
        <span className="eyebrow">Manifesto</span>
        <p className="mt-10 font-display text-3xl font-medium leading-[1.25] tracking-tight text-ink md:text-5xl md:leading-[1.2]">
          {words.map((w, i) => {
            const start = i / words.length;
            const end = start + 1 / words.length;
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const opacity = useTransform(
              scrollYProgress,
              [start, end],
              [0.16, 1]
            );
            return (
              <motion.span key={i} style={{ opacity }} className="mr-[0.25em] inline-block">
                {w}
              </motion.span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
