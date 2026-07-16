'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PXMark } from './ui/Logo';

/**
 * Opening act: a white void, the PX mark scales up slowly while the
 * PEPTIDEX wordmark and thesis fade in, then the whole plate lifts to
 * reveal the hero — roughly two seconds of held silence.
 */
export default function Preloader({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    lenis?.stop();
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence
      onExitComplete={() => {
        document.body.style.overflow = '';
        const lenis = (
          window as unknown as { __lenis?: { start: () => void; scrollTo: (n: number) => void } }
        ).__lenis;
        lenis?.scrollTo(0);
        lenis?.start();
        onComplete();
      }}
    >
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper"
          exit={{ y: '-100%' }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            initial={{ scale: 0.72, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <PXMark className="h-20 w-24 text-ink md:h-24 md:w-28" />
            <motion.div
              initial={{ opacity: 0, letterSpacing: '0.5em' }}
              animate={{ opacity: 1, letterSpacing: '0.34em' }}
              transition={{ duration: 1.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 font-display text-2xl font-semibold tracking-[0.34em] text-ink md:text-3xl"
            >
              PEPTIDEX
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-16 text-[0.7rem] font-medium tracking-[0.4em] text-muted"
          >
            SCIENCE. PRECISION. TRANSFORMATION.
          </motion.p>

          <motion.div
            className="absolute bottom-0 left-0 h-[2px] bg-ink"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, ease: [0.4, 0, 0.2, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
