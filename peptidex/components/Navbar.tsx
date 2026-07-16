'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { PXMark } from './ui/Logo';
import MagneticButton from './ui/MagneticButton';

const links = [
  { label: 'Science', href: '/#science' },
  { label: 'Fitness', href: '/#categories' },
  { label: 'Beauty', href: '/#categories' },
  { label: 'Longevity', href: '/#categories' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    setOpen(false);
    const id = href.split('#')[1];
    if (!id) return;
    const el = document.getElementById(id);
    const lenis = (
      window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }
    ).__lenis;
    if (el && lenis) lenis.scrollTo(el, { offset: -80 });
    else el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        className={`flex w-full max-w-6xl items-center justify-between rounded-full px-5 py-2.5 transition-all duration-500 ease-lux ${
          scrolled
            ? 'glass shadow-glass'
            : 'border border-transparent bg-transparent'
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="PEPTIDEX home">
          <PXMark className="h-7 w-8 text-ink" showMolecule />
          <span className="font-display text-sm font-semibold tracking-[0.22em] text-ink">
            PEPTIDEX
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="group relative rounded-full px-4 py-2 text-sm text-muted transition-colors hover:text-ink"
            >
              {l.label}
              <span className="absolute bottom-1.5 left-1/2 h-px w-0 -translate-x-1/2 bg-ink transition-all duration-300 ease-lux group-hover:w-4" />
            </button>
          ))}
        </div>

        <div className="hidden md:block">
          <MagneticButton
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-accent"
            strength={0.4}
          >
            Request Access
          </MagneticButton>
        </div>

        <button
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span
            className={`h-px w-5 bg-ink transition-all duration-300 ${
              open ? 'translate-y-[3px] rotate-45' : ''
            }`}
          />
          <span
            className={`h-px w-5 bg-ink transition-all duration-300 ${
              open ? '-translate-y-[3px] -rotate-45' : ''
            }`}
          />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass absolute left-4 right-4 top-20 rounded-3xl p-4 md:hidden"
          >
            {links.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className="block w-full rounded-2xl px-4 py-3 text-left text-lg text-ink hover:bg-black/[0.03]"
              >
                {l.label}
              </button>
            ))}
            <button className="mt-2 block w-full rounded-2xl bg-ink px-4 py-3 text-center text-paper">
              Request Access
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
