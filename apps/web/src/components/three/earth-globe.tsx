'use client';

/**
 * Interactive 3D Blue Marble Earth powered by Three.js + THREE.Timer (no deprecated THREE.Clock).
 * Features:
 *   • Shaded Earth surface with Fresnel atmospheric glow
 *   • Dual tilted orbital satellite rings & animated satellite beacons
 *   • Subtle 3D deep-space starfield
 *   • Geographically aligned 3D country picking via Raycaster
 *   • Scroll-reactive camera framing & smooth pointer parallax
 */

import { useEffect, useRef } from 'react';
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

export function EarthGlobe({
  markers = [],
  className,
  scrollReactive = false,
  onCountrySelect,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef(markers);
  const onSelectRef = useRef(onCountrySelect);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    onSelectRef.current = onCountrySelect;
  }, [onCountrySelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.45);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.54);
    const keyLight = new THREE.DirectionalLight('#fff7ee', 2.25);
    keyLight.position.set(-3, 2, 4);
    const rimLight = new THREE.PointLight('#508cff', 0.4);
    rimLight.position.set(3, -1, -3);
    scene.add(ambient, keyLight, rimLight);

    // Subtle 3D starfield
    const starCount = 260;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 5.5 + ((i * 37) % 100) * 0.04;
      const theta = i * 2.39996;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: '#9ec5ff',
      size: 0.022,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Main Globe Group
    const group = new THREE.Group();
    scene.add(group);

    // Earth surface
    const texture = new THREE.TextureLoader().load('/earth-blue-marble.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.offset.x = 0.25;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const earthGeo = new THREE.SphereGeometry(R, 96, 72);
    const earthMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.04,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    group.add(earthMesh);

    // Fresnel Atmosphere
    const atmosphereGeo = new THREE.SphereGeometry(1.078, 96, 72);
    const atmosphereMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewPosition = -viewPosition.xyz;
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          float rim = 1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
          float glow = pow(rim, 3.0) * 0.78;
          gl_FragColor = vec4(vec3(0.24, 0.62, 1.0) * glow, glow);
        }
      `,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    atmosphereMesh.renderOrder = 2;
    group.add(atmosphereMesh);

    // Dual 3D Orbital Satellite Rings + Moving Beacons
    const orbitGroupA = new THREE.Group();
    orbitGroupA.rotation.set(0.42, 0.2, 0.32);
    const orbitGeoA = new THREE.TorusGeometry(1.24, 0.0024, 8, 128);
    const orbitMatA = new THREE.MeshBasicMaterial({
      color: '#72e3b4',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    orbitGroupA.add(new THREE.Mesh(orbitGeoA, orbitMatA));

    const satGeo = new THREE.SphereGeometry(0.018, 12, 12);
    const satMatA = new THREE.MeshBasicMaterial({ color: '#72e3b4' });
    const satA = new THREE.Mesh(satGeo, satMatA);
    const satHaloGeo = new THREE.SphereGeometry(0.048, 12, 12);
    const satHaloMatA = new THREE.MeshBasicMaterial({
      color: '#72e3b4',
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    satA.add(new THREE.Mesh(satHaloGeo, satHaloMatA));
    orbitGroupA.add(satA);
    group.add(orbitGroupA);

    const orbitGroupB = new THREE.Group();
    orbitGroupB.rotation.set(-0.55, -0.3, -0.45);
    const orbitGeoB = new THREE.TorusGeometry(1.34, 0.002, 8, 128);
    const orbitMatB = new THREE.MeshBasicMaterial({
      color: '#86baff',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    orbitGroupB.add(new THREE.Mesh(orbitGeoB, orbitMatB));

    const satMatB = new THREE.MeshBasicMaterial({ color: '#86baff' });
    const satB = new THREE.Mesh(satGeo, satMatB);
    const satHaloMatB = new THREE.MeshBasicMaterial({
      color: '#86baff',
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    satB.add(new THREE.Mesh(satHaloGeo, satHaloMatB));
    orbitGroupB.add(satB);
    group.add(orbitGroupB);

    // Country picking layer
    const countryGroup = new THREE.Group();
    const countryMeshes: THREE.Mesh[] = [];
    const pickMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const records = getCountryRecords();
    const recordByMesh = new Map<THREE.Object3D, CountryRecord>();
    for (const record of records) {
      const mesh = new THREE.Mesh(record.geometry, pickMat);
      recordByMesh.set(mesh, record);
      countryMeshes.push(mesh);
      countryGroup.add(mesh);
    }
    group.add(countryGroup);

    // Dynamic markers group
    const markerGroup = new THREE.Group();
    group.add(markerGroup);
    const markerCoreGeo = new THREE.SphereGeometry(0.028, 14, 14);
    const markerCoreMat = new THREE.MeshBasicMaterial({ color: '#72e3b4' });
    const markerPulseGeo = new THREE.SphereGeometry(0.075, 14, 14);
    const markerPulseMat = new THREE.MeshBasicMaterial({
      color: '#86baff',
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    let lastMarkerKey = '';
    const activePulseMeshes: THREE.Mesh[] = [];

    const syncMarkers = () => {
      const list = markersRef.current;
      const key = list.map((m) => `${m.lon.toFixed(3)},${m.lat.toFixed(3)}`).join('|');
      if (key === lastMarkerKey) return;
      lastMarkerKey = key;
      markerGroup.clear();
      activePulseMeshes.length = 0;
      for (const m of list) {
        const holder = new THREE.Group();
        holder.position.copy(spherePoint(m.lon, m.lat, R * 1.015));
        const core = new THREE.Mesh(markerCoreGeo, markerCoreMat);
        const pulse = new THREE.Mesh(markerPulseGeo, markerPulseMat);
        holder.add(core, pulse);
        activePulseMeshes.push(pulse);
        markerGroup.add(holder);
      }
    };

    // Pointer parallax & country picking
    const pointer = new THREE.Vector2(0, 0);
    const smoothPointer = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onClick = (e: MouseEvent) => {
      if (!onSelectRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(countryMeshes, false);
      if (hits.length > 0) {
        const rec = recordByMesh.get(hits[0].object);
        if (rec) {
          onSelectRef.current({
            name: rec.name,
            latitude: rec.latitude,
            longitude: rec.longitude,
          });
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
    renderer.domElement.addEventListener('click', onClick);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(1, Math.floor(entry.contentRect.width));
      const h = Math.max(1, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // THREE.Timer replaces deprecated THREE.Clock
    const timer = new THREE.Timer();
    timer.connect(document);

    let progress = 0;
    let frameId = 0;

    const animate = (timestamp: number) => {
      frameId = window.requestAnimationFrame(animate);
      timer.update(timestamp);
      const elapsed = timer.getElapsed();

      syncMarkers();

      let target = 0;
      if (scrollReactive) {
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        target = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
      }
      progress += (target - progress) * 0.045;
      const smooth = THREE.MathUtils.smoothstep(progress, 0, 1);

      smoothPointer.x += (pointer.x - smoothPointer.x) * 0.04;
      smoothPointer.y += (pointer.y - smoothPointer.y) * 0.04;

      const mobile = window.innerWidth < 720;
      const zoomIn = THREE.MathUtils.smoothstep(smooth, 0, 0.5);
      const zoomOut = THREE.MathUtils.smoothstep(smooth, 0.45, 1);

      group.position.set(
        scrollReactive ? (mobile ? 0.02 : THREE.MathUtils.lerp(1.18, 0.85, zoomOut)) : 0,
        scrollReactive && mobile ? -0.42 : scrollReactive ? 0.02 : 0,
        0,
      );

      group.scale.setScalar(
        scrollReactive ? (mobile ? 0.78 : 1) * (1 + zoomIn * 0.07 - zoomOut * 0.14) : 1,
      );

      group.rotation.y =
        Math.PI * 0.12 +
        (scrollReactive ? elapsed * 0.045 + smooth * 0.35 : elapsed * 0.12) +
        smoothPointer.x * 0.08;
      group.rotation.x = -0.06 + Math.sin(elapsed * 0.16) * 0.02 + smoothPointer.y * 0.05;

      // Animate orbital satellites
      const angleA = elapsed * 0.42;
      satA.position.set(1.24 * Math.cos(angleA), 1.24 * Math.sin(angleA), 0);
      const angleB = -elapsed * 0.31 + 1.8;
      satB.position.set(1.34 * Math.cos(angleB), 1.34 * Math.sin(angleB), 0);

      // Subtle starfield drift
      stars.rotation.y = elapsed * 0.008;
      stars.rotation.x = elapsed * 0.003;

      // Pulse selected country markers
      const pulseScale = 1 + 0.38 * Math.sin(elapsed * 3.0);
      for (const pulse of activePulseMeshes) {
        pulse.scale.setScalar(pulseScale);
      }

      camera.position.z = scrollReactive ? 4.4 - zoomIn * 0.72 + zoomOut * 1.45 : 4.45;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      timer.disconnect();
      timer.dispose();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      earthGeo.dispose();
      earthMat.dispose();
      texture.dispose();
      atmosphereGeo.dispose();
      atmosphereMat.dispose();
      orbitGeoA.dispose();
      orbitMatA.dispose();
      orbitGeoB.dispose();
      orbitMatB.dispose();
      satGeo.dispose();
      satHaloGeo.dispose();
      satMatA.dispose();
      satMatB.dispose();
      satHaloMatA.dispose();
      satHaloMatB.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      pickMat.dispose();
      markerCoreGeo.dispose();
      markerCoreMat.dispose();
      markerPulseGeo.dispose();
      markerPulseMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollReactive]);

  return <div ref={containerRef} className={className} />;
}
