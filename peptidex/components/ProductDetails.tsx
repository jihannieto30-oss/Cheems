'use client';

import Link from 'next/link';
import { products, type Product } from '@/lib/products';
import Reveal from './ui/Reveal';
import Counter from './ui/Counter';
import CSSVial from './ui/CSSVial';
import MagneticButton from './ui/MagneticButton';
import Footer from './Footer';

export default function ProductDetails({ product }: { product: Product }) {
  const others = products.filter((p) => p.slug !== product.slug);

  return (
    <>
      {/* spec sheet */}
      <section className="relative bg-paper px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <span className="eyebrow">Technical Profile</span>
            <h2 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tighter2 text-ink md:text-6xl">
              {product.description}
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline md:grid-cols-3">
            {[
              ['Peptide purity', product.purity],
              ['Molecular weight', product.molecularWeight],
              ['Sequence', product.sequence],
              ['Recommended dosage', product.dosage],
              ['Storage', product.storage],
              ['Batch reference', product.batch],
            ].map(([k, v]) => (
              <div key={k} className="bg-paper p-8">
                <div className="text-xs tracking-[0.16em] text-muted">{k}</div>
                <div className="mt-3 font-display text-2xl font-medium text-ink">
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* purity counters */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { v: parseFloat(product.purity), d: 1, s: '%', l: 'Verified purity' },
              { v: 100, d: 0, s: '%', l: 'Batch tested' },
              { v: 0, d: 1, s: ' defects', l: 'Tolerance policy' },
            ].map((c) => (
              <Reveal key={c.l}>
                <div className="rounded-3xl border border-hairline bg-paper p-8 shadow-glass">
                  <div className="font-display text-5xl font-semibold tracking-tight text-ink">
                    <Counter value={c.v} decimals={c.d} suffix={c.s} />
                  </div>
                  <p className="mt-3 text-sm text-muted">{c.l}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* cross-sell — other instruments */}
      <section className="bg-paper px-6 pb-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-12 flex items-end justify-between border-t border-hairline pt-12">
              <h3 className="font-display text-3xl font-semibold tracking-tighter2 text-ink md:text-5xl">
                Continue the collection
              </h3>
            </div>
          </Reveal>
          <div className="grid gap-8 md:grid-cols-2">
            {others.map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="group grid grid-cols-[140px_1fr] items-center gap-6 rounded-[32px] border border-hairline bg-[radial-gradient(120%_80%_at_50%_0%,#fbfcff,#f4f6fb)] p-8 transition-shadow duration-500 hover:shadow-card"
              >
                <div className="scale-[0.55] origin-left">
                  <CSSVial
                    label={p.name}
                    category={p.category}
                    liquid={p.vialTint}
                  />
                </div>
                <div>
                  <span className="eyebrow">{p.category}</span>
                  <div className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
                    {p.name}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {p.tagline}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink">
                    Explore
                    <span className="transition-transform duration-500 ease-lux group-hover:translate-x-1.5">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <MagneticButton
              as="a"
              href="/"
              className="rounded-full border border-hairline px-8 py-4 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
              strength={0.4}
            >
              ← Back to PEPTIDEX
            </MagneticButton>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
