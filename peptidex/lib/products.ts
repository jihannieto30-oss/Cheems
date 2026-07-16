export type Category = 'FITNESS' | 'BEAUTY' | 'LONGEVITY';

export interface Product {
  slug: string;
  name: string;
  fullName: string;
  category: Category;
  tagline: string;
  description: string;
  purity: string;
  dosage: string;
  storage: string;
  batch: string;
  research: string;
  molecularWeight: string;
  sequence: string;
  accent: string; // per-category tint used sparingly
  vialTint: string; // internal liquid tint (subtle)
}

export const products: Product[] = [
  {
    slug: 'px-9',
    name: 'PX-9',
    fullName: 'PX-9 Growth Complex',
    category: 'FITNESS',
    tagline: 'Build performance at the cellular level.',
    description:
      'A precision-engineered secretagogue complex formulated to support lean tissue synthesis, accelerated recovery and sustained output under load.',
    purity: '99.4%',
    dosage: '250–500 mcg / day',
    storage: '−20 °C lyophilized',
    batch: 'PX9-2407-A',
    research: 'Third-party HPLC + MS verified',
    molecularWeight: '3367.9 g/mol',
    sequence: 'Tyr-D-Ala-Gly-Phe-Leu',
    accent: '#0A0A0A',
    vialTint: 'rgba(230,236,255,0.08)',
  },
  {
    slug: 'px-lumen',
    name: 'PX-LUMEN',
    fullName: 'PX-LUMEN Dermal Series',
    category: 'BEAUTY',
    tagline: 'Elevate aesthetics through molecular precision.',
    description:
      'A copper-peptide dermal series engineered to support collagen density, skin elasticity and a visibly refined, luminous complexion.',
    purity: '99.1%',
    dosage: '1–2 mg / week',
    storage: '2–8 °C reconstituted',
    batch: 'LUM-2407-C',
    research: 'Clinical-grade sterility tested',
    molecularWeight: '1252.5 g/mol',
    sequence: 'Gly-His-Lys-Cu',
    accent: '#1E5EFF',
    vialTint: 'rgba(200,224,255,0.12)',
  },
  {
    slug: 'px-eon',
    name: 'PX-EON',
    fullName: 'PX-EON Longevity Matrix',
    category: 'LONGEVITY',
    tagline: 'Extend possibility. Redefine time.',
    description:
      'A mitochondrial-support matrix engineered around NAD+ pathways and cellular senescence signaling to extend healthspan at its foundation.',
    purity: '99.6%',
    dosage: '5–10 mg / cycle',
    storage: '−20 °C lyophilized',
    batch: 'EON-2407-E',
    research: 'Endotoxin < 0.5 EU/mg',
    molecularWeight: '664.4 g/mol',
    sequence: 'Glu-Asp-Arg',
    accent: '#666666',
    vialTint: 'rgba(240,240,244,0.10)',
  },
];

export const categories: {
  key: Category;
  title: string;
  sub: string;
  line: string;
  slug: string;
}[] = [
  {
    key: 'FITNESS',
    title: 'FITNESS',
    sub: 'Build Performance',
    line: 'Engineered for output, recovery and the relentless pursuit of a stronger baseline.',
    slug: 'px-9',
  },
  {
    key: 'BEAUTY',
    title: 'BEAUTY',
    sub: 'Elevate Aesthetics',
    line: 'Molecular skincare designed to refine, restore and reveal luminous precision.',
    slug: 'px-lumen',
  },
  {
    key: 'LONGEVITY',
    title: 'LONGEVITY',
    sub: 'Extend Possibility',
    line: 'Cellular science built to extend healthspan and rewrite the limits of time.',
    slug: 'px-eon',
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
