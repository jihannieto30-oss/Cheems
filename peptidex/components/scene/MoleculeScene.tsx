'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, Float } from '@react-three/drei';
import * as THREE from 'three';
import Molecule from './Molecule';

export default function MoleculeScene() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 6], fov: 34 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        powerPreference: 'high-performance',
      }}
      className="!absolute inset-0"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 5, 3]} intensity={1.3} />
      <Suspense fallback={null}>
        <Float speed={1.2} floatIntensity={0.5} rotationIntensity={0.3}>
          <Molecule scale={1.1} />
        </Float>
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={2} position={[0, 3, 2]} scale={[6, 3, 1]} />
          <Lightformer
            intensity={1}
            position={[-4, 0, 2]}
            scale={[3, 5, 1]}
            color="#eef2ff"
          />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
