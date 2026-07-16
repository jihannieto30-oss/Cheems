'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import Reveal, { MaskReveal } from './ui/Reveal';
import Counter from './ui/Counter';
import TiltCard from './ui/TiltCard';

const MoleculeScene = dynamic(() => import('./scene/MoleculeScene'), {
  ssr: false,
});

const stats = [
  { value: 99.6, decimals: 1, suffix: '%', label: 'Peptide purity, HPLC verified' },
  { value: 100, suffix: '%', label: 'Third-party batch tested' },
  { value: 0.5, decimals: 1, prefix: '<', suffix: ' EU/mg', label: 'Endotoxin ceiling' },
  { value: 24, suffix: '', prefix: '', label: 'Quality checkpoints per lot' },
];

export default function Science() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const molY = useTransform(scrollYProgress, [0, 1], ['12%', '-12%']);
  const wordY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section
      id="science"
      ref={ref}
      className="relative overflow-hidden bg-ink px-6 py-32 text-paper"
    >
      {/* ghost background word (slowest) */}
      <motion.span
        style={{ y: wordY }}
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[24vw] font-bold text-white/[0.03]"
      >
        SCIENCE
      </motion.span>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div>
            <span className="eyebrow !text-white/40">The Science</span>
            <h2 className="mt-6 font-display text-4xl font-semibold leading-[0.95] tracking-tighter2 md:text-6xl">
              <MaskReveal>Purity you</MaskReveal>
              <MaskReveal delay={0.08}>can measure.</MaskReveal>
              <MaskReveal delay={0.16}>
                <span className="text-accent">Precision you can feel.</span>
              </MaskReveal>
            </h2>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-white/60">
                Every PEPTIDEX compound is synthesised, purified and interrogated
                under research-grade protocol. No shortcuts. No proprietary
                blends. Only molecules good enough to carry the name.
              </p>
            </Reveal>
          </div>

          {/* animated molecule */}
          <motion.div
            style={{ y: molY }}
            className="relative h-[46vh] min-h-[340px] w-full"
          >
            <MoleculeScene />
          </motion.div>
        </div>

        {/* glass stat interface */}
        <div className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <TiltCard
                intensity={6}
                className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-md"
              >
                <div className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
                  <Counter
                    value={s.value}
                    decimals={s.decimals ?? 0}
                    suffix={s.suffix}
                    prefix={s.prefix}
                  />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/50">
                  {s.label}
                </p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
