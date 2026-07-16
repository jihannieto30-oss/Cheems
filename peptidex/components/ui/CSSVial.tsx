'use client';

import { motion } from 'framer-motion';

interface Props {
  label?: string;
  category?: string;
  liquid?: string;
  className?: string;
}

/**
 * A pure-CSS glass vial used where a full WebGL canvas would be overkill
 * (showcase rows). Layered highlights + a travelling specular streak give
 * the read of real glass without a render loop.
 */
export default function CSSVial({
  label = 'PX-9',
  category = 'FITNESS',
  liquid = 'rgba(30,94,255,0.10)',
  className = '',
}: Props) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      <div className="relative mx-auto h-[420px] w-[150px]">
        {/* aluminium cap */}
        <div className="absolute left-1/2 top-0 z-20 h-[54px] w-[78px] -translate-x-1/2 rounded-[10px] bg-[linear-gradient(90deg,#9aa0a8,#e9ecf1_35%,#c2c6cc_60%,#8f959d)] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.4)]">
          <div className="absolute left-1/2 top-1/2 h-[22px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/90 shadow-inner" />
          <div className="absolute inset-x-2 bottom-1 h-px bg-black/20" />
          <div className="absolute inset-x-2 top-2 h-px bg-white/50" />
        </div>
        {/* neck */}
        <div className="absolute left-1/2 top-[48px] z-10 h-[26px] w-[58px] -translate-x-1/2 bg-[linear-gradient(90deg,rgba(0,0,0,0.05),rgba(255,255,255,0.6)_40%,rgba(0,0,0,0.06))]" />

        {/* glass body */}
        <div className="absolute left-1/2 top-[70px] h-[340px] w-[120px] -translate-x-1/2 overflow-hidden rounded-[26px] border border-black/[0.08] bg-[linear-gradient(100deg,rgba(255,255,255,0.7)_0%,rgba(240,243,250,0.35)_45%,rgba(255,255,255,0.6)_100%)] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.35),inset_0_0_30px_rgba(255,255,255,0.6)]">
          {/* liquid */}
          <div
            className="absolute inset-x-2 bottom-2 h-[62%] rounded-[20px]"
            style={{ background: liquid, boxShadow: 'inset 0 8px 18px rgba(255,255,255,0.4)' }}
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-white/40" />
          </div>

          {/* label */}
          <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-lg border border-black/[0.06] bg-white/85 px-2 py-3 text-center backdrop-blur-sm">
            <div className="text-[7px] font-medium tracking-[0.2em] text-muted">
              ENGINEERED BEYOND PERFECTION
            </div>
            <div className="mt-1 text-[15px] font-bold tracking-tight text-ink">
              PEPTIDEX
            </div>
            <div className="text-[10px] font-semibold text-accent">{label}</div>
            <div className="mt-1 text-[6px] tracking-[0.15em] text-muted">
              {category} · 10 mL
            </div>
          </div>

          {/* left highlight */}
          <div className="absolute left-2 top-4 h-[90%] w-3 rounded-full bg-white/70 blur-[1px]" />
          {/* travelling specular streak */}
          <motion.div
            className="absolute -inset-y-4 w-10 skew-x-12 bg-white/40 blur-md"
            initial={{ x: -40 }}
            animate={{ x: 180 }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: 'easeInOut',
            }}
          />
        </div>

        {/* contact shadow */}
        <div className="absolute -bottom-4 left-1/2 h-6 w-[130px] -translate-x-1/2 rounded-[50%] bg-black/25 blur-xl" />
      </div>
    </div>
  );
}
