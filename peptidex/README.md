# PEPTIDEX — Engineered Beyond Perfection

A cinematic, ultra-premium brand experience for **PEPTIDEX**, built to feel like
Apple × Tesla × Nothing × Vercel × Arc — minimalist, scientific and physically
present. This is not an e-commerce template; it's a scroll-driven story with a
real-time 3D glass vial at its centre.

## Experience

- **Cinematic preloader** — white void, the PX mark scales up, `SCIENCE. PRECISION. TRANSFORMATION.`, then the plate lifts to reveal the hero.
- **Hero** — giant `ENGINEERED / BEYOND / PERFECTION` (PERFECTION in accent blue) beside a floating, rotating, cursor-reactive **3D glass vial** with a slow DNA helix, dust particles and a scroll-driven camera orbit. Layered parallax: vial · DNA · background wordmark each move at their own rate.
- **Categories** — FITNESS · BEAUTY · LONGEVITY as full-height blocks with large PX marks and independent parallax.
- **Science** — Apple-keynote section: animated 3D peptide molecule, glass stat panels and figures that count up.
- **Collection** — products presented as hero objects (tilt, travelling glass reflections, parallax), not shop cards.
- **Product experience** — a full-screen immersive 3D route (`/products/[slug]`): drag to rotate, scroll to zoom, an **Exploded View** that separates cap / stopper / body, and scientific hotspots (purity, dosage, storage, batch).
- **Microinteractions** — magnetic buttons, 3D tilt + glare cards, mask reveals, sliding arrows, glass-morphism navbar with scroll blur.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** design system (`#FFFFFF` / `#0A0A0A` / `#666666` / accent `#1E5EFF` / hairline `rgba(0,0,0,.08)`)
- **React Three Fiber** + **Three.js** + **@react-three/drei** — `MeshTransmissionMaterial`, PBR metals, inline `Lightformer` studio (no external HDRI), contact shadows
- **GSAP** + **ScrollTrigger** and **Lenis** for smooth scroll
- **Framer Motion** for reveals, parallax and micro-interactions

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Design tokens

| Token     | Value                 |
| --------- | --------------------- |
| Paper     | `#FFFFFF`             |
| Ink       | `#0A0A0A`             |
| Muted     | `#666666`             |
| Accent    | `#1E5EFF`             |
| Hairline  | `rgba(0,0,0,0.08)`    |

No gradients, no neon, no glow. Luxury through simplicity, whitespace and
impeccable hierarchy.

> For research use only. Not for human consumption.
