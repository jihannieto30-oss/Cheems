'use client';

import Link from 'next/link';
import { PXMark } from './ui/Logo';
import MagneticButton from './ui/MagneticButton';
import Reveal, { MaskReveal } from './ui/Reveal';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink px-6 pb-12 pt-32 text-paper">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="eyebrow !text-white/40">Request Access</span>
        </Reveal>
        <h2 className="mt-8 font-display text-[13vw] font-semibold leading-[0.86] tracking-tightest md:text-[8vw]">
          <MaskReveal>ENGINEERED</MaskReveal>
          <MaskReveal delay={0.08}>
            BEYOND <span className="text-accent">PERFECTION.</span>
          </MaskReveal>
        </h2>

        <div className="mt-14 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md text-lg leading-relaxed text-white/55">
            PEPTIDEX is available to qualified researchers and partners. Join the
            waitlist for early access to the collection.
          </p>
          <MagneticButton
            className="rounded-full bg-paper px-8 py-4 text-sm font-medium text-ink transition-colors hover:bg-accent hover:text-paper"
            strength={0.45}
          >
            Join the Waitlist
          </MagneticButton>
        </div>

        <div className="mt-28 grid gap-10 border-t border-white/10 pt-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <PXMark className="h-9 w-10 text-paper" />
              <span className="font-display text-lg font-semibold tracking-[0.2em]">
                PEPTIDEX
              </span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/40">
              Science. Precision. Transformation. Research-grade peptides
              engineered beyond perfection.
            </p>
          </div>

          <div>
            <div className="text-xs tracking-[0.2em] text-white/40">DOMAINS</div>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              {['Fitness', 'Beauty', 'Longevity'].map((x) => (
                <li key={x}>
                  <Link
                    href="/#categories"
                    className="transition-colors hover:text-paper"
                  >
                    {x}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs tracking-[0.2em] text-white/40">COMPANY</div>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              {['Science', 'Quality', 'Contact', 'Legal'].map((x) => (
                <li key={x}>
                  <a href="#" className="transition-colors hover:text-paper">
                    {x}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col justify-between gap-3 text-xs text-white/35 md:flex-row">
          <span>© {new Date().getFullYear()} PEPTIDEX. All rights reserved.</span>
          <span>For research use only. Not for human consumption.</span>
        </div>
      </div>
    </footer>
  );
}
