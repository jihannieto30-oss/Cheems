'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Environment,
  Lightformer,
  ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';
import Vial from './Vial';
import DNA from './DNA';
import Particles from './Particles';

/** Self-contained studio: soft key, cool rim and window strips — no external HDRI. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <group rotation={[0, 0, 0]}>
        <Lightformer
          intensity={2.4}
          position={[0, 3, 2]}
          scale={[8, 3, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.1}
          position={[-4, 1, 1]}
          scale={[3, 6, 1]}
          color="#eef2ff"
        />
        <Lightformer
          intensity={1.3}
          position={[4, 2, 1]}
          scale={[3, 6, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={0.8}
          position={[0, -3, 2]}
          scale={[6, 3, 1]}
          color="#dfe6ff"
        />
      </group>
    </Environment>
  );
}

/** Orbits the camera subtly with scroll and eases toward the pointer. */
function Rig() {
  const { camera } = useThree();
  const vec = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const scrollY =
      typeof window !== 'undefined'
        ? window.scrollY / Math.max(1, window.innerHeight)
        : 0;
    const s = Math.min(1.4, scrollY);

    const angle = s * 0.7;
    const targetX = Math.sin(angle) * 6 + state.pointer.x * 0.5;
    const targetZ = Math.cos(angle) * 6;
    const targetY = 0.2 + s * 0.4 + state.pointer.y * 0.35;

    vec.current.set(targetX, targetY, targetZ);
    camera.position.lerp(vec.current, 1 - Math.pow(0.001, delta));
    camera.lookAt(0, -0.1 - s * 0.2, 0);
  });
  return null;
}

interface Props {
  label?: string;
  category?: string;
  tint?: string;
}

export default function VialScene({
  label = 'PX-9',
  category = 'FITNESS',
  tint = '#eef2ff',
}: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 0.2, 7.4], fov: 28 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        powerPreference: 'high-performance',
      }}
      className="!absolute inset-0"
    >
      <color attach="background" args={['#ffffff']} />
      <fog attach="fog" args={['#ffffff', 9, 18]} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />

      <Suspense fallback={null}>
        {/* Parallax depths: DNA slowest, particles mid, vial front */}
        <group position={[2.1, -0.2, -4.2]}>
          <DNA speed={0.09} height={9} radius={0.7} count={20} />
        </group>

        <Particles count={110} />

        <Vial
          label={label}
          category={category}
          tint={tint}
          autoRotate
          pointerTilt
          scale={0.95}
        />

        <ContactShadows
          position={[0, -1.55, 0]}
          opacity={0.35}
          scale={9}
          blur={2.6}
          far={4}
          resolution={512}
          color="#000000"
        />

        <Studio />
      </Suspense>

      <Rig />
    </Canvas>
  );
}
