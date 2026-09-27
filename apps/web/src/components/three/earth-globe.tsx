'use client';

/**
 * Real WebGL 3D Earth globe (three.js via @react-three/fiber).
 *
 * No textures are shipped with the repo, so the surface is a procedural
 * graticule + point-cloud earth built from math — it represents the planet
 * generically (a visualization), not any satellite dataset. Decorative chrome
 * around the real MapLibre workspace.
 */

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type GlobeProps = {
  /** Marker coordinates (lon, lat in degrees) — orbit-arc endpoints get markers. */
  markers?: Array<{ lon: number; lat: number; label?: string }>;
  /** Optional satellites orbiting the globe. */
  satellites?: number;
  className?: string;
};

const R = 1.28; // globe radius

function lonLatToVec3(lon: number, lat: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Dot-matrix continents: dense points where a coarse landmass bitmap says land. */
const LAND = [
  '..............................',
  '..........##.....####.........',
  '.......########..######..#....',
  '.....#############.####..##...',
  '....###############.###.###...',
  '....##############...######...',
  '.....####..#######....####....',
  '.....###....#####.....##......',
  '......#.....####..............',
  '...........#######...####.....',
  '..........#########.######....',
  '..........##########.#####....',
  '...........#########...##.....',
  '...........########..........#',
  '...........#######............',
  '............#####.......#.....',
  '.............###.......##.....',
  '.............##.........#.....',
  '..............................',
  '.......###........####........',
  '......######.....#######......',
  '......#######....######.......',
  '.......#####.....####.........',
  '..............................',
];

function GlobePoints() {
  const geo = useMemo(() => {
    const positions: number[] = [];
    const cols = LAND[0].length;
    const rows = LAND.length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (LAND[r][c] !== '#') continue;
        const lon = (c / cols) * 360 - 180;
        const lat = 90 - (r / rows) * 180;
        // jitter for organic dot spread
        const jLon = (Math.sin(r * 12.9898 + c * 78.233) * 43758.5453) % 1;
        const jLat = (Math.sin(c * 12.9898 + r * 34.117) * 24634.6345) % 1;
        const v = lonLatToVec3(lon + jLon * 2.2, lat + jLat * 1.6, R * (1 + (jLat > 0 ? 0.004 : 0)));
        positions.push(v.x, v.y, v.z);
      }
    }
    // graticule dots (full sphere, sparse)
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lon = -180; lon < 180; lon += 10) {
        const v = lonLatToVec3(lon, lat, R * 0.998);
        positions.push(v.x, v.y, v.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial
        size={0.016}
        color="#22d3ee"
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function GlobeCore() {
  return (
    <mesh>
      <sphereGeometry args={[R * 0.985, 48, 48]} />
      <meshBasicMaterial color="#071120" transparent opacity={0.92} />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.16}>
      <sphereGeometry args={[R, 48, 48]} />
      <meshBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.05}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function Graticule() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    // parallels
    for (let lat = -60; lat <= 60; lat += 30) {
      const rad = R * 1.002 * Math.cos((lat * Math.PI) / 180);
      const y = R * 1.002 * Math.sin((lat * Math.PI) / 180);
      for (let a = 0; a < 64; a++) {
        const t1 = (a / 64) * Math.PI * 2;
        const t2 = ((a + 1) / 64) * Math.PI * 2;
        pts.push(Math.cos(t1) * rad, y, Math.sin(t1) * rad);
        pts.push(Math.cos(t2) * rad, y, Math.sin(t2) * rad);
      }
    }
    // meridians
    for (let lon = 0; lon < 180; lon += 30) {
      const t = (lon * Math.PI) / 180;
      for (let a = 0; a < 48; a++) {
        const p1 = (a / 48) * Math.PI * 2;
        const p2 = ((a + 1) / 48) * Math.PI * 2;
        pts.push(
          Math.cos(p1) * R * 1.002 * Math.cos(t), Math.sin(p1) * R * 1.002, Math.cos(p1) * R * 1.002 * Math.sin(t),
          Math.cos(p2) * R * 1.002 * Math.cos(t), Math.sin(p2) * R * 1.002, Math.cos(p2) * R * 1.002 * Math.sin(t),
        );
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#3b82f6" transparent opacity={0.14} depthWrite={false} />
    </lineSegments>
  );
}

function OrbitRings({ satellites }: { satellites: number }) {
  const group = useRef<THREE.Group>(null);
  const sats = useMemo(
    () =>
      Array.from({ length: satellites }).map((_, i) => ({
        tilt: (i / satellites) * Math.PI,
        phase: (i / satellites) * Math.PI * 2,
        speed: 0.25 + (i % 3) * 0.08,
        r: R * (1.35 + i * 0.14),
      })),
    [satellites],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    let i = 0;
    group.current?.children.forEach((child) => {
      if (!(child instanceof THREE.Group)) return;
      const sat = sats[i++];
      if (!sat) return;
      child.position.set(
        Math.cos(t * sat.speed + sat.phase) * sat.r,
        Math.sin(t * sat.speed + sat.phase) * sat.r * 0.22,
        Math.sin(t * sat.speed + sat.phase) * sat.r * 0.5,
      );
    });
  });

  return (
    <group ref={group}>
      <OrbitPath radius={R * 1.42} />
      {sats.map((sat, i) => (
        <group key={i}>
          <mesh>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshBasicMaterial color="#e6f1fa" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function OrbitPath({ radius }: { radius: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const seg = 96;
    for (let a = 0; a < seg; a++) {
      const t1 = (a / seg) * Math.PI * 2;
      const t2 = ((a + 1) / seg) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(Math.cos(t1) * radius, Math.sin(t1) * radius * 0.22, Math.sin(t1) * radius * 0.5),
        new THREE.Vector3(Math.cos(t2) * radius, Math.sin(t2) * radius * 0.22, Math.sin(t2) * radius * 0.5),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#22d3ee" transparent opacity={0.22} depthWrite={false} />
    </lineSegments>
  );
}

function Marker({ lon, lat }: { lon: number; lat: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => lonLatToVec3(lon, lat, R * 1.01), [lon, lat]);
  useFrame((state) => {
    const s = 1 + 0.35 * Math.sin(state.clock.elapsedTime * 2.4);
    ref.current?.scale.setScalar(s);
  });
  return (
    <group position={pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SpinningGroup({ children, speed = 0.12 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });
  return <group ref={ref}>{children}</group>;
}

export function EarthGlobe({ markers = [], satellites = 2, className }: GlobeProps) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0.9, 4.4], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1} />
          <SpinningGroup speed={0.1}>
            <GlobeCore />
            <GlobePoints />
            <Graticule />
          </SpinningGroup>
          <Atmosphere />
          <OrbitRings satellites={satellites} />
          {markers.map((m, i) => (
            <Marker key={`${m.lon}-${m.lat}-${i}`} lon={m.lon} lat={m.lat} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
