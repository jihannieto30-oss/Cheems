'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Atom {
  pos: [number, number, number];
  r: number;
  color: string;
}
interface Bond {
  a: number;
  b: number;
}

/** A stylised peptide molecule — atoms + bonds — rotating slowly. */
export default function Molecule({ scale = 1 }: { scale?: number }) {
  const group = useRef<THREE.Group>(null);

  const { atoms, bonds } = useMemo(() => {
    const atoms: Atom[] = [
      { pos: [0, 0, 0], r: 0.34, color: '#0a0a0a' },
      { pos: [1.1, 0.3, 0.2], r: 0.26, color: '#1e5eff' },
      { pos: [-1.0, 0.5, -0.3], r: 0.28, color: '#cfd2d6' },
      { pos: [0.3, 1.2, -0.5], r: 0.24, color: '#1e5eff' },
      { pos: [-0.4, -1.1, 0.4], r: 0.26, color: '#cfd2d6' },
      { pos: [1.6, -0.6, -0.4], r: 0.22, color: '#0a0a0a' },
      { pos: [-1.7, -0.3, 0.5], r: 0.22, color: '#0a0a0a' },
    ];
    const bonds: Bond[] = [
      { a: 0, b: 1 },
      { a: 0, b: 2 },
      { a: 0, b: 3 },
      { a: 0, b: 4 },
      { a: 1, b: 5 },
      { a: 2, b: 6 },
    ];
    return { atoms, bonds };
  }, []);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.2;
      group.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  return (
    <group ref={group} scale={scale}>
      {atoms.map((a, i) => (
        <mesh key={i} position={a.pos}>
          <sphereGeometry args={[a.r, 32, 32]} />
          <meshStandardMaterial
            color={a.color}
            roughness={0.25}
            metalness={0.3}
            envMapIntensity={1.2}
          />
        </mesh>
      ))}
      {bonds.map((b, i) => {
        const start = new THREE.Vector3(...atoms[b.a].pos);
        const end = new THREE.Vector3(...atoms[b.b].pos);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const len = start.distanceTo(end);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          end.clone().sub(start).normalize()
        );
        return (
          <mesh key={i} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.05, 0.05, len, 12]} />
            <meshStandardMaterial color="#9aa0a8" roughness={0.4} metalness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}
