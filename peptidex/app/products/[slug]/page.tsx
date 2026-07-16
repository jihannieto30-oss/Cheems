import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { products, getProduct } from '@/lib/products';
import ProductExperience from '@/components/ProductExperience';
import ProductDetails from '@/components/ProductDetails';

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: 'PEPTIDEX' };
  return {
    title: `${product.fullName} — PEPTIDEX`,
    description: `${product.tagline} ${product.description}`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <main>
      <ProductExperience product={product} />
      <ProductDetails product={product} />
    </main>
  );
}
