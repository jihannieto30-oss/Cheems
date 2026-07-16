'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';
import { MaskReveal } from './ui/Reveal';
import MagneticButton from './ui/MagneticButton';

const VialScene = dynamic(() => import('./scene/VialScene'), { ssr: false });

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Layered parallax speeds
  const bgTextY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const headlineY = useTransform(scrollYProgress, [0, 1], ['0%', '60%']);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const sceneY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden"
    >
      {/* Slowest layer — vast ghost wordmark */}
      <motion.div
        style={{ y: bgTextY }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="select-none font-display text-[26vw] font-bold leading-none tracking-tighter text-black/[0.025]">
          PEPTIDEX
        </span>
      </motion.div>

      {/* 3D vial layer */}
      <motion.div
        style={{ y: sceneY }}
        className="absolute inset-0 md:left-[38%]"
      >
        <VialScene label="PX-9" category="FITNESS" tint="#eef2ff" />
      </motion.div>

      {/* Headline layer (fastest) */}
      <motion.div
        style={{ y: headlineY, opacity: headlineOpacity }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 pt-24"
      >
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow mb-6"
        >
          Research-Grade Peptides
        </motion.span>

        <h1 className="display-huge text-[15vw] leading-[0.86] text-ink md:text-[8.5vw]">
          <MaskReveal delay={0.3}>ENGINEERED</MaskReveal>
          <MaskReveal delay={0.42}>BEYOND</MaskReveal>
          <MaskReveal delay={0.54}>
            <span className="text-accent">PERFECTION</span>
          </MaskReveal>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex max-w-md flex-col gap-6"
        >
          <p className="text-base leading-relaxed text-muted md:text-lg">
            The Ferrari of peptide science. Every molecule purified, verified
            and engineered for a single purpose — transformation without
            compromise.
          </p>
          <div className="flex items-center gap-4">
            <MagneticButton
              className="rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-accent"
              strength={0.4}
            >
              Explore the Science
            </MagneticButton>
            <span className="text-sm text-muted">Engineered in silence.</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-[0.65rem] tracking-[0.3em] text-muted">SCROLL</span>
        <span className="relative h-10 w-px overflow-hidden bg-black/10">
          <motion.span
            className="absolute inset-x-0 top-0 h-4 bg-ink"
            animate={{ y: [-16, 40] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.div>
    </section>
  );
}
