'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Sparse dust motes drifting in depth — reads as sterile lab air. */
export default function Particles({
  count = 140,
  color = '#0a0a0a',
}: {
  count?: number;
  color?: string;
}) {
  const ref = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      speeds[i] = 0.1 + Math.random() * 0.25;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * 0.004;
      arr[i * 3] += Math.sin(t * 0.3 + i) * 0.0009;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -6;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    pts.rotation.y = t * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </points>
  );
}
