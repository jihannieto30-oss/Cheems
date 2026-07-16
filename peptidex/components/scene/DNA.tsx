'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  count?: number;
  height?: number;
  radius?: number;
  speed?: number;
  color?: string;
}

/**
 * A slow double-helix living behind the vial. Instanced spheres for the
 * bases + thin connecting rungs. Rotates slower than the vial for parallax.
 */
export default function DNA({
  count = 26,
  height = 8,
  radius = 0.9,
  speed = 0.12,
  color = '#0a0a0a',
}: Props) {
  const group = useRef<THREE.Group>(null);
  const strandA = useRef<THREE.InstancedMesh>(null);
  const strandB = useRef<THREE.InstancedMesh>(null);

  const rungs = useMemo(() => {
    const arr: { pos: THREE.Vector3; rot: number; len: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = (t - 0.5) * height;
      const a = t * Math.PI * 6;
      arr.push({
        pos: new THREE.Vector3(0, y, 0),
        rot: a,
        len: radius * 2,
      });
    }
    return arr;
  }, [count, height, radius]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (group.current) group.current.rotation.y = time * speed;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = (t - 0.5) * height;
      const a = t * Math.PI * 6;

      dummy.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
      dummy.scale.setScalar(0.09);
      dummy.updateMatrix();
      strandA.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(
        Math.cos(a + Math.PI) * radius,
        y,
        Math.sin(a + Math.PI) * radius
      );
      dummy.updateMatrix();
      strandB.current?.setMatrixAt(i, dummy.matrix);
    }
    if (strandA.current) strandA.current.instanceMatrix.needsUpdate = true;
    if (strandB.current) strandB.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={strandA} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={strandB} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#1e5eff" roughness={0.35} metalness={0.15} />
      </instancedMesh>
      {rungs.map((r, i) => (
        <mesh key={i} position={r.pos} rotation={[0, r.rot, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, r.len, 8]} />
          <meshStandardMaterial
            color="#b4b8be"
            transparent
            opacity={0.22}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
