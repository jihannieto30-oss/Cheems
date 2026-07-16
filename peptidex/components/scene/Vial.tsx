'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

interface VialProps {
  exploded?: boolean;
  autoRotate?: boolean;
  pointerTilt?: boolean;
  label?: string;
  category?: string;
  tint?: string;
  scale?: number;
}

/** Builds the hollow, thick-walled glass silhouette via a lathe profile. */
function useVialGeometry() {
  return useMemo(() => {
    const p = (x: number, y: number) => new THREE.Vector2(x, y);
    const pts: THREE.Vector2[] = [
      p(0.0, -1.26),
      p(0.34, -1.26),
      p(0.56, -1.18),
      p(0.62, -1.04),
      p(0.62, 0.72),
      p(0.6, 0.9),
      p(0.42, 1.05),
      p(0.34, 1.15),
      p(0.4, 1.22),
      p(0.4, 1.29),
      // inner wall (creates real glass thickness)
      p(0.33, 1.29),
      p(0.33, 1.2),
      p(0.28, 1.05),
      p(0.55, 0.86),
      p(0.55, -1.0),
      p(0.5, -1.12),
      p(0.3, -1.18),
      p(0.0, -1.18),
    ];
    const geo = new THREE.LatheGeometry(pts, 96);
    geo.computeVertexNormals();
    return geo;
  }, []);
}

/** Wrap-around PEPTIDEX label rendered to a canvas texture at runtime. */
function useLabelTexture(label: string, category: string) {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);

    // subtle top/bottom hairlines
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 40, c.width - 48, c.height - 80);

    ctx.fillStyle = '#666666';
    ctx.font = '500 26px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E N G I N E E R E D   B E Y O N D   P E R F E C T I O N', c.width / 2, 108);

    ctx.fillStyle = '#0a0a0a';
    ctx.font = '700 118px -apple-system, Segoe UI, sans-serif';
    ctx.fillText('PEPTIDEX', c.width / 2, 260);

    ctx.fillStyle = '#1e5eff';
    ctx.font = '600 42px -apple-system, Segoe UI, sans-serif';
    ctx.fillText(label, c.width / 2, 330);

    ctx.fillStyle = '#666666';
    ctx.font = '500 24px -apple-system, Segoe UI, sans-serif';
    ctx.fillText(`${category}  ·  RESEARCH GRADE  ·  10 mL`, c.width / 2, 400);

    ctx.fillStyle = '#0a0a0a';
    ctx.font = '500 20px monospace';
    ctx.fillText('LOT PX-2407   ·   FOR RESEARCH USE ONLY', c.width / 2, 448);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = THREE.RepeatWrapping;
    // orient so the label reads facing forward
    tex.repeat.x = -1;
    tex.offset.x = 0.25;
    return tex;
  }, [label, category]);
}

export default function Vial({
  exploded = false,
  autoRotate = true,
  pointerTilt = true,
  label = 'PX-9',
  category = 'FITNESS',
  tint = '#eef2ff',
  scale = 1,
}: VialProps) {
  const glassGeo = useVialGeometry();
  const labelTex = useLabelTexture(label, category);

  const root = useRef<THREE.Group>(null);
  const capGroup = useRef<THREE.Group>(null);
  const stopperRef = useRef<THREE.Group>(null);
  const liquidRef = useRef<THREE.Mesh>(null);

  const target = useRef({ capY: 0, stopY: 0 });

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;

    if (autoRotate) {
      g.rotation.y += delta * 0.28;
    }

    if (pointerTilt) {
      const px = state.pointer.x;
      const py = state.pointer.y;
      g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -px * 0.12, 0.06);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, py * 0.12, 0.06);
    }

    // exploded separation
    target.current.capY = exploded ? 1.15 : 0;
    target.current.stopY = exploded ? 0.55 : 0;
    if (capGroup.current) {
      capGroup.current.position.y = THREE.MathUtils.lerp(
        capGroup.current.position.y,
        target.current.capY,
        0.08
      );
    }
    if (stopperRef.current) {
      stopperRef.current.position.y = THREE.MathUtils.lerp(
        stopperRef.current.position.y,
        target.current.stopY,
        0.08
      );
    }
    if (liquidRef.current) {
      const mat = liquidRef.current.material as THREE.MeshPhysicalMaterial;
      mat.opacity = exploded ? 0.9 : 0.75;
    }
  });

  return (
    <Float
      speed={1.4}
      rotationIntensity={pointerTilt ? 0.15 : 0}
      floatIntensity={0.5}
      floatingRange={[-0.06, 0.08]}
    >
      <group ref={root} scale={scale} position={[0, -0.1, 0]}>
        {/* ---- Glass body ---- */}
        <mesh geometry={glassGeo} castShadow>
          <MeshTransmissionMaterial
            transmission={1}
            thickness={0.55}
            roughness={0.03}
            ior={1.46}
            chromaticAberration={0.06}
            anisotropy={0.1}
            distortion={0.2}
            distortionScale={0.3}
            temporalDistortion={0.1}
            clearcoat={1}
            clearcoatRoughness={0.04}
            attenuationColor={tint}
            attenuationDistance={2.4}
            samples={6}
            resolution={512}
            backside
          />
        </mesh>

        {/* ---- Internal liquid ---- */}
        <mesh ref={liquidRef} position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1.2, 64]} />
          <meshPhysicalMaterial
            color={tint}
            transmission={0.9}
            thickness={0.4}
            roughness={0.12}
            ior={1.34}
            transparent
            opacity={0.75}
            attenuationColor={tint}
            attenuationDistance={1.2}
          />
        </mesh>
        {/* liquid meniscus highlight */}
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.02, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.14} />
        </mesh>

        {/* ---- Wrap label ---- */}
        {labelTex && (
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.635, 0.635, 0.82, 96, 1, true]} />
            <meshStandardMaterial
              map={labelTex}
              roughness={0.55}
              metalness={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* ---- Rubber stopper ---- */}
        <group ref={stopperRef} position={[0, 0, 0]}>
          <mesh position={[0, 1.16, 0]}>
            <cylinderGeometry args={[0.3, 0.28, 0.22, 48]} />
            <meshStandardMaterial color="#3a3d42" roughness={0.7} metalness={0.05} />
          </mesh>
          <mesh position={[0, 1.28, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.05, 48]} />
            <meshStandardMaterial color="#33363b" roughness={0.75} />
          </mesh>
        </group>

        {/* ---- Aluminum crimp cap ---- */}
        <group ref={capGroup} position={[0, 0, 0]}>
          {/* crimp skirt */}
          <mesh position={[0, 1.16, 0]}>
            <cylinderGeometry args={[0.44, 0.42, 0.34, 64]} />
            <meshStandardMaterial
              color="#c9ccd1"
              metalness={1}
              roughness={0.28}
              envMapIntensity={1.4}
            />
          </mesh>
          {/* brushed ring detail */}
          <mesh position={[0, 1.02, 0]}>
            <torusGeometry args={[0.43, 0.02, 12, 64]} />
            <meshStandardMaterial color="#9aa0a8" metalness={1} roughness={0.4} />
          </mesh>
          {/* top plate */}
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.44, 0.44, 0.04, 64]} />
            <meshStandardMaterial color="#d6d9de" metalness={1} roughness={0.2} />
          </mesh>
          {/* flip-off center */}
          <mesh position={[0, 1.38, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 48]} />
            <meshStandardMaterial color="#1e5eff" metalness={0.4} roughness={0.35} />
          </mesh>
        </group>
      </group>
    </Float>
  );
}
