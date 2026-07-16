'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import Vial from './scene/Vial';
import DNA from './scene/DNA';
import Molecule from './scene/Molecule';
import Particles from './scene/Particles';
import { PXMark } from './ui/Logo';
import type { Product } from '@/lib/products';

interface Hotspot {
  id: string;
  label: string;
  value: string;
  detail: string;
  pos: [number, number, number];
}

function ProductStudio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer intensity={2.4} position={[0, 3, 2]} scale={[8, 3, 1]} color="#ffffff" />
      <Lightformer intensity={1.2} position={[-4, 1, 1]} scale={[3, 6, 1]} color="#eef2ff" />
      <Lightformer intensity={1.4} position={[4, 2, 1]} scale={[3, 6, 1]} color="#ffffff" />
      <Lightformer intensity={0.8} position={[0, -3, 2]} scale={[6, 3, 1]} color="#dfe6ff" />
    </Environment>
  );
}

export default function ProductExperience({ product }: { product: Product }) {
  const [exploded, setExploded] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const hotspots: Hotspot[] = [
    {
      id: 'purity',
      label: 'Purity',
      value: product.purity,
      detail: 'HPLC + mass-spec verified. Every peak accounted for.',
      pos: [0.9, 0.2, 0.4],
    },
    {
      id: 'dosage',
      label: 'Dosage',
      value: product.dosage,
      detail: 'Research protocol dosing. Precision-weighed per vial.',
      pos: [-0.95, -0.3, 0.4],
    },
    {
      id: 'storage',
      label: 'Storage',
      value: product.storage,
      detail: 'Cold-chain integrity from synthesis to delivery.',
      pos: [0.9, -0.8, 0.3],
    },
    {
      id: 'batch',
      label: 'Batch',
      value: product.batch,
      detail: `Third-party tested. ${product.research}.`,
      pos: [-0.9, 0.6, 0.3],
    },
  ];

  const activeSpot = hotspots.find((h) => h.id === active);

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-paper">
      {/* ---- 3D stage ---- */}
      <div
        className="absolute inset-0"
        data-lenis-prevent
      >
        <Canvas
          shadows
          dpr={[1, 1.8]}
          camera={{ position: [0, 0.2, 7.4], fov: 30 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            powerPreference: 'high-performance',
          }}
        >
          <color attach="background" args={['#ffffff']} />
          <fog attach="fog" args={['#ffffff', 10, 20]} />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[3, 6, 4]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <Suspense fallback={null}>
            <group position={[0, 0, -3.5]}>
              <DNA speed={0.08} height={10} radius={1} />
            </group>
            <group position={[-2.4, 1.4, -2]}>
              <Molecule scale={0.5} />
            </group>
            <Particles count={100} />

            <Vial
              exploded={exploded}
              autoRotate={false}
              pointerTilt={false}
              label={product.name}
              category={product.category}
              tint={product.vialTint || '#eef2ff'}
              scale={1.0}
            />

            {/* scientific hotspots (only when exploded) */}
            {exploded &&
              hotspots.map((h) => (
                <Html
                  key={h.id}
                  position={h.pos}
                  center
                  distanceFactor={8}
                  zIndexRange={[20, 0]}
                >
                  <button
                    onClick={() => setActive(h.id)}
                    className="group flex items-center gap-2 whitespace-nowrap"
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                        active === h.id
                          ? 'border-accent bg-accent'
                          : 'border-ink/40 bg-white/70 group-hover:border-ink'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          active === h.id ? 'bg-white' : 'bg-ink'
                        }`}
                      />
                    </span>
                    <span className="rounded-full border border-hairline bg-white/80 px-2.5 py-1 text-[10px] font-medium tracking-wide text-ink backdrop-blur-sm">
                      {h.label} · {h.value}
                    </span>
                  </button>
                </Html>
              ))}

            <ContactShadows
              position={[0, -1.7, 0]}
              opacity={0.35}
              scale={10}
              blur={2.6}
              far={4}
              resolution={512}
            />
            <ProductStudio />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={4.5}
            maxDistance={11}
            autoRotate={!exploded}
            autoRotateSpeed={0.6}
            minPolarAngle={Math.PI / 3.5}
            maxPolarAngle={Math.PI / 1.7}
            makeDefault
          />
        </Canvas>
      </div>

      {/* ---- Overlay UI ---- */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-10">
        {/* top bar */}
        <div className="pointer-events-auto flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm text-ink"
          >
            <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1">
              ←
            </span>
            <PXMark className="h-6 w-7 text-ink" showMolecule={false} />
            <span className="font-display font-semibold tracking-[0.18em]">
              PEPTIDEX
            </span>
          </Link>
          <span className="eyebrow hidden md:block">{product.category}</span>
        </div>

        {/* left title */}
        <div className="max-w-md">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="eyebrow"
          >
            {product.fullName}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 font-display text-6xl font-semibold leading-[0.9] tracking-tightest text-ink md:text-8xl"
          >
            {product.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-sm text-base leading-relaxed text-muted"
          >
            {product.tagline}
          </motion.p>
        </div>

        {/* bottom controls */}
        <div className="pointer-events-auto flex items-end justify-between">
          <div className="hidden text-xs leading-relaxed text-muted md:block">
            <p>Drag to rotate · Scroll to zoom</p>
            <p>Cursor-reactive · Real-time transmission glass</p>
          </div>

          <button
            onClick={() => {
              setExploded((e) => !e);
              setActive(null);
            }}
            className={`pointer-events-auto rounded-full px-6 py-3.5 text-sm font-medium transition-all duration-500 ease-lux ${
              exploded
                ? 'bg-accent text-paper'
                : 'bg-ink text-paper hover:bg-accent'
            }`}
          >
            {exploded ? 'Reassemble' : 'Exploded View'}
          </button>
        </div>
      </div>

      {/* ---- hotspot detail panel ---- */}
      <AnimatePresence>
        {activeSpot && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass pointer-events-auto absolute right-6 top-1/2 hidden w-72 -translate-y-1/2 rounded-3xl p-6 shadow-glass md:block"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">{activeSpot.label}</span>
              <button
                onClick={() => setActive(null)}
                className="text-muted hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink">
              {activeSpot.value}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {activeSpot.detail}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
