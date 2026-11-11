'use client';

/**
 * Shaded Blue Marble Earth with a thin atmosphere and geographically aligned picking.
 * Supports:
 *   • Scroll-driven, gently changing globe framing
 *   • Interactive hover & click on 3D country polygons
 *   • Silent, geographically aligned country picking
 *   • A single shaded Earth surface and thin atmospheric rim
 */

import { Suspense, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import worldTopology from 'world-atlas/countries-110m.json';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

export type CountryRecord = {
  name: string;
  latitude: number;
  longitude: number;
  geometry: THREE.BufferGeometry;
};

export type GlobeProps = {
  markers?: Array<{ lon: number; lat: number; label?: string }>;
  className?: string;
  scrollReactive?: boolean;
  onCountrySelect?: (country: { name: string; latitude: number; longitude: number }) => void;
};

type CountryFeature = Feature<Geometry, { name?: string } | null>;

const R = 1;
const SPHERE_RADIUS = 1.01;

function spherePoint(longitude: number, latitude: number, radius = SPHERE_RADIUS): THREE.Vector3 {
  const lon = THREE.MathUtils.degToRad(longitude);
  const lat = THREE.MathUtils.degToRad(latitude);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  );
}

function unwrapRing(ring: Position[]): [number, number][] {
  const source = ring.slice(0, -1);
  const result: [number, number][] = [];
  let previous = Number(source[0]?.[0] ?? 0);
  for (const position of source) {
    let longitude = Number(position[0]);
    const latitude = Number(position[1]);
    while (longitude - previous > 180) longitude -= 360;
    while (longitude - previous < -180) longitude += 360;
    result.push([longitude, latitude]);
    previous = longitude;
  }
  return result;
}

function curvedTriangle(
  positions: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  depth = 1,
): void {
  if (depth > 0) {
    const midpoint = (left: THREE.Vector3, right: THREE.Vector3) =>
      left.clone().add(right).normalize().multiplyScalar(SPHERE_RADIUS);
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    curvedTriangle(positions, a, ab, ca, depth - 1);
    curvedTriangle(positions, ab, b, bc, depth - 1);
    curvedTriangle(positions, ca, bc, c, depth - 1);
    curvedTriangle(positions, ab, bc, ca, depth - 1);
    return;
  }
  for (const point of [a, b, c]) {
    positions.push(point.x, point.y, point.z);
  }
}

let cachedCountryRecords: CountryRecord[] | null = null;

export function getCountryRecords(): CountryRecord[] {
  if (cachedCountryRecords) return cachedCountryRecords;

  const topology = worldTopology as unknown as { objects: { countries: object } };
  const collection = feature(topology as never, topology.objects.countries as never) as unknown as FeatureCollection;
  const records: CountryRecord[] = [];

  for (const item of collection.features as CountryFeature[]) {
    const geometry = item.geometry;
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) continue;
    if (item.properties?.name === 'Antarctica') continue;

    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    const positions: number[] = [];

    for (const polygon of polygons) {
      const rings = polygon
        .map((ring) => unwrapRing(ring))
        .filter((ring) => ring.length >= 3);
      const contour = rings[0];
      if (!contour) continue;
      const contourCenter = contour.reduce((sum, [longitude]) => sum + longitude, 0) / contour.length;
      const holes = rings.slice(1).map((ring) => {
        const holeCenter = ring.reduce((sum, [longitude]) => sum + longitude, 0) / ring.length;
        const longitudeShift = Math.round((contourCenter - holeCenter) / 360) * 360;
        return ring.map(([longitude, latitude]): [number, number] => [longitude + longitudeShift, latitude]);
      });
      const allPoints = [contour, ...holes].flat();
      const triangles = THREE.ShapeUtils.triangulateShape(
        contour.map(([lon, lat]) => new THREE.Vector2(lon, lat)),
        holes.map((ring) => ring.map(([lon, lat]) => new THREE.Vector2(lon, lat))),
      );
      const vertex = ([longitude, latitude]: [number, number]) => spherePoint(longitude, latitude);

      for (const [ia, ib, ic] of triangles) {
        curvedTriangle(positions, vertex(allPoints[ia]), vertex(allPoints[ib]), vertex(allPoints[ic]));
      }

    }

    if (!positions.length) continue;

    const surface = new THREE.BufferGeometry();
    surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    surface.computeVertexNormals();

    const [longitude, latitude] = geoCentroid(item as Feature<Geometry>);
    records.push({
      name: item.properties?.name || `Territory ${String(item.id ?? '')}`,
      latitude,
      longitude,
      geometry: surface,
    });
  }

  records.sort((a, b) => a.name.localeCompare(b.name));
  cachedCountryRecords = records;
  return records;
}

function CountryItem({
  record,
  onSelect,
}: {
  record: CountryRecord;
  onSelect?: () => void;
}) {
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect?.();
    },
    [onSelect],
  );

  return (
    <mesh geometry={record.geometry} onClick={handleClick}>
      <meshBasicMaterial colorWrite={false} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CountryLayer({
  onSelectCountry,
}: {
  onSelectCountry?: (country: { name: string; latitude: number; longitude: number }) => void;
}) {
  const records = useMemo(() => getCountryRecords(), []);

  return (
    <group>
      {records.map((record) => (
        <CountryItem
          key={record.name}
          record={record}
          onSelect={() =>
            onSelectCountry?.({
              name: record.name,
              latitude: record.latitude,
              longitude: record.longitude,
            })
          }
        />
      ))}
    </group>
  );
}

function GlobeMarker({ lon, lat }: { lon: number; lat: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const position = useMemo(() => spherePoint(lon, lat, R * 1.01), [lon, lat]);
  useFrame((state) => ref.current?.scale.setScalar(1 + 0.35 * Math.sin(state.clock.elapsedTime * 2.4)));

  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshBasicMaterial color="#f3d489" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color="#4e9ef0" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DemoGlobe({
  markers,
  scrollReactive,
  onCountrySelect,
}: Required<Pick<GlobeProps, 'markers' | 'scrollReactive'>> & {
  onCountrySelect?: (c: { name: string; latitude: number; longitude: number }) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => {
    const map = new THREE.TextureLoader().load('/earth-blue-marble.jpg');
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.offset.x = 0.25;
    map.anisotropy = gl.capabilities.getMaxAnisotropy();
    return map;
  }, [gl]);

  const atmosphereGeometry = useMemo(() => new THREE.SphereGeometry(1.075, 96, 72), []);

  const progressRef = useRef(0);
  const targetRef = useRef(0);

  useFrame((state) => {
    if (!group.current) return;

    if (scrollReactive) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetRef.current = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
    } else {
      targetRef.current = 0;
    }

    progressRef.current += (targetRef.current - progressRef.current) * 0.035;
    const progress = THREE.MathUtils.smoothstep(progressRef.current, 0, 1);

    const elapsed = state.clock.getElapsedTime();
    const mobile = window.innerWidth < 720;
    const zoomIn = THREE.MathUtils.smoothstep(progress, 0, 0.48);
    const zoomOut = THREE.MathUtils.smoothstep(progress, 0.43, 1);

    group.current.position.set(
      scrollReactive ? (mobile ? 0.02 : THREE.MathUtils.lerp(1.26, 0.92, zoomOut)) : 0,
      scrollReactive && mobile ? -0.47 : scrollReactive ? 0.03 : 0,
      0,
    );

    group.current.scale.setScalar(
      scrollReactive ? (mobile ? 0.78 : 1) * (1 + zoomIn * 0.06 - zoomOut * 0.16) : 1,
    );

    group.current.rotation.y =
      Math.PI * 0.1 + (scrollReactive ? elapsed * 0.034 + progress * 0.23 : elapsed * 0.1);
    group.current.rotation.x = -0.055 + Math.sin(elapsed * 0.13) * 0.018;

    state.camera.position.z = scrollReactive ? 4.45 - zoomIn * 0.78 + zoomOut * 1.73 : 4.45;
    state.camera.lookAt(0, 0, 0);

  });

  return (
    <group ref={group}>
      <mesh onClick={(event) => event.stopPropagation()}>
        <sphereGeometry args={[R, 96, 72]} />
        <meshStandardMaterial map={texture} roughness={0.92} metalness={0} />
      </mesh>
      <mesh
        geometry={atmosphereGeometry}
        renderOrder={2}
      >
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
              vNormal = normalize(normalMatrix * normal);
              vViewPosition = -viewPosition.xyz;
              gl_Position = projectionMatrix * viewPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            void main() {
              float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
              float glow = pow(rim, 3.0) * 0.72;
              gl_FragColor = vec4(vec3(0.24, 0.58, 1.0) * glow, glow);
            }
          `}
        />
      </mesh>
      {onCountrySelect && <CountryLayer onSelectCountry={onCountrySelect} />}
      {markers.map((marker) => (
        <GlobeMarker key={`${marker.lon}-${marker.lat}`} lon={marker.lon} lat={marker.lat} />
      ))}
    </group>
  );
}

export function EarthGlobe({
  markers = [],
  className,
  scrollReactive = false,
  onCountrySelect,
}: GlobeProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 4.45], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.52} />
          <directionalLight position={[-3, 2, 4]} intensity={2.2} color="#fff7ee" />
          <pointLight position={[3, -1, -3]} intensity={0.34} color="#508cff" />
          <DemoGlobe
            markers={markers}
            scrollReactive={scrollReactive}
            onCountrySelect={onCountrySelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
