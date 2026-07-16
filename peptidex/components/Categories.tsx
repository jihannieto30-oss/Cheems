'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { categories } from '@/lib/products';
import { PXMark } from './ui/Logo';
import Reveal from './ui/Reveal';

function CategoryRow({
  index,
  data,
}: {
  index: number;
  data: (typeof categories)[number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // each row's mark drifts at its own rate → independent parallax
  const markY = useTransform(scrollYProgress, [0, 1], ['40%', '-40%']);
  const numX = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const isBeauty = data.key === 'BEAUTY';

  return (
    <Link href={`/products/${data.slug}`} className="group block">
      <motion.div
        ref={ref}
        className="relative flex min-h-[62vh] items-center border-b border-hairline"
      >
        {/* enormous index number, slow drift */}
        <motion.span
          style={{ x: numX }}
          className="pointer-events-none absolute right-0 select-none font-display text-[30vw] font-bold leading-none text-black/[0.03] md:text-[18vw]"
        >
          0{index + 1}
        </motion.span>

        <div className="relative z-10 flex w-full items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="eyebrow">{data.sub}</span>
            <h3 className="mt-4 font-display text-[12vw] font-semibold leading-[0.9] tracking-tightest text-ink md:text-[6.5vw]">
              {data.title}
              {isBeauty && <span className="text-accent">.</span>}
            </h3>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted md:text-lg">
              {data.line}
            </p>
            <span className="mt-8 inline-flex items-center gap-3 text-sm font-medium text-ink">
              <span className="relative overflow-hidden">
                Enter {data.title.toLowerCase()}
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-500 ease-lux group-hover:scale-x-100" />
              </span>
              <span className="inline-block transition-transform duration-500 ease-lux group-hover:translate-x-2">
                →
              </span>
            </span>
          </div>

          <motion.div
            style={{ y: markY }}
            className="hidden shrink-0 md:block"
            whileHover={{ scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <PXMark
              className={`h-56 w-64 transition-colors duration-500 ${
                isBeauty ? 'text-accent/90' : 'text-ink'
              } opacity-90 group-hover:opacity-100`}
            />
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function Categories() {
  return (
    <section id="categories" className="relative bg-paper px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-16 flex items-end justify-between">
            <h2 className="max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tighter2 text-ink md:text-6xl">
              Three disciplines.
              <br />
              One standard of precision.
            </h2>
            <span className="hidden text-sm text-muted md:block">
              [ Select a domain ]
            </span>
          </div>
        </Reveal>

        <div>
          {categories.map((c, i) => (
            <CategoryRow key={c.key} index={i} data={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
