'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { products } from '@/lib/products';
import Reveal from './ui/Reveal';
import TiltCard from './ui/TiltCard';
import CSSVial from './ui/CSSVial';
import MagneticButton from './ui/MagneticButton';

function ProductRow({
  product,
  reversed,
}: {
  product: (typeof products)[number];
  reversed: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const vialY = useTransform(scrollYProgress, [0, 1], ['22%', '-22%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);

  return (
    <div
      ref={ref}
      className="grid items-center gap-10 border-b border-hairline py-24 md:grid-cols-2 md:gap-16"
    >
      <motion.div
        style={{ y: vialY }}
        className={reversed ? 'md:order-2' : ''}
      >
        <Link href={`/products/${product.slug}`}>
          <TiltCard
            intensity={10}
            glare={false}
            className="rounded-[40px] border border-hairline bg-[radial-gradient(120%_80%_at_50%_0%,#fbfcff,#f4f6fb)] py-10 shadow-card"
          >
            <CSSVial
              label={product.name}
              category={product.category}
              liquid={product.vialTint}
            />
          </TiltCard>
        </Link>
      </motion.div>

      <motion.div style={{ y: textY }} className={reversed ? 'md:order-1' : ''}>
        <span className="eyebrow">{product.category}</span>
        <h3 className="mt-4 font-display text-5xl font-semibold leading-[0.95] tracking-tighter2 text-ink md:text-7xl">
          {product.name}
        </h3>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
          {product.tagline} {product.description}
        </p>

        <div className="mt-8 grid max-w-sm grid-cols-2 gap-x-8 gap-y-5">
          {[
            ['Purity', product.purity],
            ['Dosage', product.dosage],
            ['Storage', product.storage],
            ['Mol. weight', product.molecularWeight],
          ].map(([k, v]) => (
            <div key={k} className="border-t border-hairline pt-3">
              <div className="text-xs tracking-[0.14em] text-muted">{k}</div>
              <div className="mt-1 text-sm font-medium text-ink">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <MagneticButton
            as="a"
            href={`/products/${product.slug}`}
            className="inline-flex items-center gap-3 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-accent"
            strength={0.4}
          >
            <span>Enter 3D experience</span>
            <span>→</span>
          </MagneticButton>
        </div>
      </motion.div>
    </div>
  );
}

export default function ProductShowcase() {
  return (
    <section id="products" className="relative bg-paper px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-8 max-w-3xl">
            <span className="eyebrow">The Collection</span>
            <h2 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tighter2 text-ink md:text-6xl">
              Not products. Instruments of transformation.
            </h2>
          </div>
        </Reveal>

        {products.map((p, i) => (
          <ProductRow key={p.slug} product={p} reversed={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
