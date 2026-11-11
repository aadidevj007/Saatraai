import './style.css';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import worldTopology from 'world-atlas/countries-110m.json';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

type CountryFeature = Feature<Geometry, { name?: string } | null>;
type CountryRecord = {
  name: string;
  centroid: THREE.Vector3;
  latitude: number;
  longitude: number;
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  lineMaterial: THREE.LineBasicMaterial;
  center: THREE.Vector3;
};
type WeatherSnapshot = {
  temperature: number;
  rain: number;
  time: string;
  timezone: string;
};

type WeatherState =
  | { status: 'loading' }
  | { status: 'ready'; data: WeatherSnapshot }
  | { status: 'error' };

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root is missing');

const weatherCard = () => `
  <aside class="weather-card" aria-live="polite">
    <div class="weather-card-top">
      <span class="eyebrow"><span class="live-dot"></span> LIVE CONDITIONS</span>
      <span class="weather-mark" aria-hidden="true">↗</span>
    </div>
    <div class="weather-country">Loading atmosphere…</div>
    <div class="weather-line">
      <div class="temperature-value">—°</div>
      <div class="rain-value"><span>RAINFALL / 1 H</span><strong>— mm</strong></div>
    </div>
    <div class="weather-card-foot"><span class="weather-updated">Connecting to Open-Meteo</span><span>°C · mm</span></div>
  </aside>`;

app.innerHTML = `
  <div class="space-grid" aria-hidden="true"></div>
  <div id="scene" aria-label="Interactive three-dimensional globe of Earth" role="img"></div>
  <div class="site-shell">
    <header class="topbar">
      <a class="wordmark" href="#top" aria-label="Earth Pulse, home">
        <span class="brand-symbol" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>EARTH<span class="wordmark-light">PULSE</span></span>
      </a>
      <nav aria-label="Main navigation">
        <a href="#story">The unfolding</a>
        <a href="#country-atlas">Country atlas</a>
      </nav>
      <div class="global-status"><span class="status-orbit"></span> PLANETARY FIELD / 01</div>
    </header>

    <main>
      <section class="hero" id="top">
        <div class="hero-copy">
          <div class="eyebrow hero-eyebrow"><span class="live-dot"></span> A LIVING WEATHER ATLAS</div>
          <h1>Weather has<br /><em>a shape.</em></h1>
          <p class="hero-description">Follow the pulse of our planet. Explore real-time temperature and rainfall, country by country, across one living Earth.</p>
          <a class="primary-link" href="#story"><span>Follow the signal</span><span class="arrow-circle" aria-hidden="true">↓</span></a>
          <div class="hero-index"><span>01</span><span class="index-rule"></span><span>ONE PLANET · MANY CONDITIONS</span></div>
        </div>
        <div class="hero-coordinate" aria-hidden="true"><span>34° N</span><span class="coordinate-line"></span><span>11° E</span></div>
        <div class="hero-weather">${weatherCard()}</div>
        <div class="hero-caption"><span>EARTH / 001</span><span>ORBITAL VIEW · BLUE MARBLE</span></div>
      </section>

      <section class="story" id="story" aria-label="The planet unfolds as you scroll">
        <div class="story-sticky">
          <div class="story-side-label"><span class="eyebrow">A CLOSER LOOK</span><span class="vertical-rule"></span><span class="mono">01—03</span></div>
          <div class="story-steps">
            <article class="story-step is-active" data-step="0">
              <span class="step-kicker">01 / ORBIT</span>
              <h2>One world.<br /><em>In motion.</em></h2>
              <p>Every breeze and cloud belongs to a larger pattern. Start with the whole planet, turning beneath a thin blue atmosphere.</p>
            </article>
            <article class="story-step" data-step="1">
              <span class="step-kicker">02 / UNFOLD</span>
              <h2>Boundaries<br /><em>begin to breathe.</em></h2>
              <p>Move closer. The familiar globe opens into country-shaped fragments, each holding its place in the global picture.</p>
            </article>
            <article class="story-step" data-step="2">
              <span class="step-kicker">03 / CONDITIONS</span>
              <h2>Find your<br /><em>weather here.</em></h2>
              <p>Choose a country to read the latest temperature and rainfall at its representative point. Hover the globe or search by name.</p>
            </article>
          </div>
          <div class="story-weather">${weatherCard()}</div>
          <div class="scroll-cue"><span class="scroll-mouse"><i></i></span><span>SCROLL TO UNFOLD</span></div>
          <div class="story-progress"><span class="progress-label">EARTH / <strong>01</strong></span><span class="progress-track"><i></i></span><span class="progress-label">WEATHER / 03</span></div>
        </div>
      </section>

      <section class="country-atlas" id="country-atlas">
        <div class="atlas-heading">
          <div>
            <div class="eyebrow"><span class="live-dot"></span> COUNTRY FIELD NOTES</div>
            <h2>Pick a place.<br /><em>Read the sky.</em></h2>
          </div>
          <p class="atlas-intro">Every fragment is a doorway into local conditions. Select a country below or trace its shape on the globe.</p>
        </div>
        <div class="atlas-content">
          <div class="country-browser">
            <label class="select-label" for="country-select">EXPLORE A COUNTRY <span>WORLDWIDE</span></label>
            <div class="select-wrap"><select id="country-select" aria-label="Select a country to see its weather"><option value="">Choose a country…</option></select><span aria-hidden="true">⌄</span></div>
            <div class="country-shortcuts" aria-label="Suggested countries"></div>
            <p class="browser-note"><span class="tiny-cross">+</span> Select any country for its live reading. Move over a country on the globe to preview its weather.</p>
          </div>
          <div class="explorer-weather">${weatherCard()}</div>
        </div>
        <div class="data-note"><span class="data-note-icon">i</span><p>Weather is requested live from Open-Meteo at each country's geographic center; it is a representative point reading, not a country-wide average. Rainfall is the current hourly value.</p></div>
      </section>
    </main>
    <footer class="site-footer"><a class="wordmark footer-wordmark" href="#top"><span class="brand-symbol" aria-hidden="true"><i></i><i></i><i></i></span><span>EARTH<span class="wordmark-light">PULSE</span></span></a><span>EARTH IN MOTION / WEATHER IN PLACE</span><span>EARTH TEXTURE: NASA EARTH OBSERVATORY · BLUE MARBLE</span></footer>
  </div>
`;

const sceneHost = document.querySelector<HTMLDivElement>('#scene')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-hidden', 'true');
sceneHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 0, 4.45);
const globe = new THREE.Group();
scene.add(globe);

const texture = new THREE.TextureLoader().load('/manus-storage/blue-marble_83865cda.jpg');
texture.colorSpace = THREE.SRGBColorSpace;
texture.wrapS = THREE.RepeatWrapping;
texture.offset.x = 0.25;
const earthMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1, depthWrite: false });
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, 96, 72),
  earthMaterial,
);
globe.add(earth);
const oceanShell = new THREE.Mesh(
  new THREE.SphereGeometry(1.003, 80, 60),
  new THREE.MeshBasicMaterial({ color: 0x3378e7, transparent: true, opacity: 0, depthWrite: false }),
);
globe.add(oceanShell);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.045, 64, 48),
  new THREE.MeshBasicMaterial({ color: 0x4e9ef0, transparent: true, opacity: 0.09, side: THREE.BackSide, depthWrite: false }),
);
globe.add(atmosphere);

const atmosphereEdge = new THREE.Mesh(
  new THREE.SphereGeometry(1.018, 64, 48),
  new THREE.MeshBasicMaterial({ color: 0x397ef4, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false }),
);
globe.add(atmosphereEdge);

const orbit = new THREE.Mesh(
  new THREE.RingGeometry(1.19, 1.194, 160),
  new THREE.MeshBasicMaterial({ color: 0x5c90c2, transparent: true, opacity: 0.48, side: THREE.DoubleSide }),
);
orbit.rotation.set(1.1, 0.1, -0.23);
globe.add(orbit);

const topology = worldTopology as unknown as { objects: { countries: object } };
const geoCollection = feature(topology as never, topology.objects.countries as never) as unknown as FeatureCollection;
const countryLayer = new THREE.Group();
globe.add(countryLayer);
const countryRecords: CountryRecord[] = [];
const pickMeshes: THREE.Mesh[] = [];
const recordByMesh = new WeakMap<THREE.Object3D, CountryRecord>();
const sphereRadius = 1.01;

function spherePoint(longitude: number, latitude: number, radius = sphereRadius): THREE.Vector3 {
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

type SurfaceVertex = { point: THREE.Vector3; uv: THREE.Vector2 };

function surfaceVertex(longitude: number, latitude: number): SurfaceVertex {
  return {
    point: spherePoint(longitude, latitude),
    uv: new THREE.Vector2((longitude + 180) / 360 - texture.offset.x, (latitude + 90) / 180),
  };
}

function pushCurvedTriangle(
  positions: number[],
  uvs: number[],
  a: SurfaceVertex,
  b: SurfaceVertex,
  c: SurfaceVertex,
  depth = 1,
): void {
  if (depth > 0) {
    const midpoint = (left: SurfaceVertex, right: SurfaceVertex): SurfaceVertex => ({
      point: left.point.clone().add(right.point).normalize().multiplyScalar(sphereRadius),
      uv: left.uv.clone().add(right.uv).multiplyScalar(0.5),
    });
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    pushCurvedTriangle(positions, uvs, a, ab, ca, depth - 1);
    pushCurvedTriangle(positions, uvs, ab, b, bc, depth - 1);
    pushCurvedTriangle(positions, uvs, ca, bc, c, depth - 1);
    pushCurvedTriangle(positions, uvs, ab, bc, ca, depth - 1);
    return;
  }
  for (const vertex of [a, b, c]) {
    positions.push(vertex.point.x, vertex.point.y, vertex.point.z);
    uvs.push(vertex.uv.x, vertex.uv.y);
  }
}

function countrySurface(featureItem: CountryFeature): { geometry: THREE.BufferGeometry; center: THREE.Vector3 } | null {
  const geometry = featureItem.geometry;
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return null;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const positions: number[] = [];
  const uvs: number[] = [];
  const edgePositions: number[] = [];
  for (const polygon of polygons) {
    const ring = polygon[0];
    if (!ring || ring.length < 4) continue;
    const unwrapped = unwrapRing(ring);
    if (unwrapped.length < 3) continue;
    const points = unwrapped.map(([lon, lat]) => new THREE.Vector2(lon, lat));
    const triangles = THREE.ShapeUtils.triangulateShape(points, []);
    for (const triangle of triangles) {
      const [ia, ib, ic] = triangle;
      const a = surfaceVertex(...unwrapped[ia]);
      const b = surfaceVertex(...unwrapped[ib]);
      const c = surfaceVertex(...unwrapped[ic]);
      pushCurvedTriangle(positions, uvs, a, b, c, 1);
    }
    for (let index = 0; index < unwrapped.length; index += 1) {
      const [lonA, latA] = unwrapped[index];
      const [lonB, latB] = unwrapped[(index + 1) % unwrapped.length];
      const a = spherePoint(lonA, latA, 1.014);
      const b = spherePoint(lonB, latB, 1.014);
      edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  if (positions.length === 0) return null;
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surface.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  surface.computeVertexNormals();
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(surface, material);
  mesh.userData.countryName = featureItem.properties?.name;
  group.add(mesh);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x92c7ea, transparent: true, opacity: 0.72 });
  group.add(new THREE.LineSegments(edgeGeometry, lineMaterial));
  countryLayer.add(group);
  const [longitude, latitude] = geoCentroid(featureItem as Feature<Geometry>);
  const center = spherePoint(longitude, latitude, 1);
  const name = featureItem.properties?.name || `Territory ${String(featureItem.id ?? '')}`;
  const record = { name, centroid: center, latitude, longitude, group, mesh, lineMaterial, center };
  countryRecords.push(record);
  pickMeshes.push(mesh);
  recordByMesh.set(mesh, record);
  return { geometry: surface, center };
}

for (const item of geoCollection.features as CountryFeature[]) {
  if (item.properties?.name === 'Antarctica') continue;
  countrySurface(item);
}
countryRecords.sort((a, b) => a.name.localeCompare(b.name));

const countriesByName = new Map(countryRecords.map((record) => [record.name, record]));
const selectedCountries = ['France', 'Japan', 'Brazil', 'India', 'Australia', 'Kenya'];
const shortcuts = document.querySelector<HTMLDivElement>('.country-shortcuts')!;
const countrySelect = document.querySelector<HTMLSelectElement>('#country-select')!;
for (const record of countryRecords) {
  const option = document.createElement('option');
  option.value = record.name;
  option.textContent = record.name;
  countrySelect.append(option);
}
for (const name of selectedCountries) {
  if (!countriesByName.has(name)) continue;
  const button = document.createElement('button');
  button.className = 'country-shortcut';
  button.type = 'button';
  button.dataset.country = name;
  button.innerHTML = `<span class="shortcut-glyph" aria-hidden="true">⌖</span><span>${name}</span><span class="shortcut-arrow" aria-hidden="true">↗</span>`;
  shortcuts.append(button);
}

let selectedCountry = countriesByName.get('France') ?? countryRecords[0];
let hoveredCountry: CountryRecord | null = null;
let scrollTarget = 0;
let scrollProgress = 0;
let isPointerInsideGlobe = false;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const weatherCache = new Map<string, WeatherState>();
let weatherRequestId = 0;

function escapeText(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function weatherMarkup(record: CountryRecord, state: WeatherState | undefined): string {
  const status = state?.status ?? 'loading';
  const snapshot = state?.status === 'ready' ? state.data : undefined;
  const temperature = snapshot ? `${Math.round(snapshot.temperature)}°` : '—°';
  const rainfall = snapshot ? `${Math.max(0, snapshot.rain).toFixed(1)} mm` : '— mm';
  const updated = status === 'ready'
    ? `LOCAL TIME ${snapshot?.time.slice(11, 16)} · ${snapshot?.timezone.replaceAll('_', ' ')}`
    : status === 'error'
      ? 'LIVE DATA UNAVAILABLE'
      : 'FETCHING LIVE CONDITIONS…';
  const loadingClass = status === 'loading' ? ' is-loading' : '';
  return `
    <aside class="weather-card${loadingClass}" aria-live="polite">
      <div class="weather-card-top"><span class="eyebrow"><span class="live-dot"></span> LIVE CONDITIONS</span><span class="weather-mark" aria-hidden="true">↗</span></div>
      <div class="weather-country">${escapeText(record.name)}</div>
      <div class="weather-line"><div class="temperature-value">${temperature}</div><div class="rain-value"><span>RAINFALL / 1 H</span><strong>${rainfall}</strong></div></div>
      <div class="weather-card-foot"><span class="weather-updated">${escapeText(updated)}</span><span>°C · mm</span></div>
    </aside>`;
}

function renderWeather(): void {
  if (!selectedCountry) return;
  const state = weatherCache.get(selectedCountry.name);
  for (const container of document.querySelectorAll<HTMLElement>('.hero-weather, .story-weather, .explorer-weather')) {
    container.innerHTML = weatherMarkup(selectedCountry, state);
  }
}

async function loadWeather(record: CountryRecord, force = false): Promise<void> {
  if (!force && weatherCache.get(record.name)?.status === 'ready') {
    selectedCountry = record;
    renderWeather();
    return;
  }
  const requestId = ++weatherRequestId;
  selectedCountry = record;
  weatherCache.set(record.name, { status: 'loading' });
  renderWeather();
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: record.latitude.toFixed(3),
    longitude: record.longitude.toFixed(3),
    current: 'temperature_2m,rain,precipitation',
    timezone: 'auto',
    forecast_days: '1',
  }).toString();
  try {
    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    const data = await response.json() as {
      current?: { temperature_2m?: number; rain?: number; time?: string };
      timezone?: string;
    };
    if (!data.current || typeof data.current.temperature_2m !== 'number') throw new Error('Weather data is incomplete');
    weatherCache.set(record.name, {
      status: 'ready',
      data: {
        temperature: data.current.temperature_2m,
        rain: data.current.rain ?? 0,
        time: data.current.time ?? '',
        timezone: data.timezone ?? 'Local time',
      },
    });
  } catch {
    weatherCache.set(record.name, { status: 'error' });
  }
  if (requestId === weatherRequestId && selectedCountry.name === record.name) renderWeather();
}

function chooseCountry(record: CountryRecord, syncSelect = true): void {
  selectedCountry = record;
  if (syncSelect) countrySelect.value = record.name;
  for (const item of countryRecords) {
    const isSelected = item.name === record.name;
    item.mesh.material.color.set(isSelected ? 0xffad96 : 0xffffff);
    item.lineMaterial.color.set(isSelected ? 0xff8a72 : 0x92c7ea);
    item.lineMaterial.opacity = isSelected ? 1 : 0.72;
  }
  for (const button of shortcuts.querySelectorAll<HTMLButtonElement>('.country-shortcut')) {
    button.classList.toggle('is-selected', button.dataset.country === record.name);
  }
  renderWeather();
  void loadWeather(record);
}

countrySelect.addEventListener('change', () => {
  const record = countriesByName.get(countrySelect.value);
  if (record) chooseCountry(record, false);
});
shortcuts.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-country]');
  const record = target?.dataset.country ? countriesByName.get(target.dataset.country) : undefined;
  if (record) chooseCountry(record);
});
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const id = link.getAttribute('href')?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function storyProgressFromScroll(): number {
  const storyElement = document.querySelector<HTMLElement>('.story');
  if (!storyElement) return 0;
  const start = storyElement.offsetTop;
  const length = Math.max(1, storyElement.offsetHeight - window.innerHeight);
  return THREE.MathUtils.clamp((window.scrollY - start) / length, 0, 1);
}

function updateStoryInterface(progress: number): void {
  const activeStep = progress < 0.28 ? 0 : progress < 0.72 ? 1 : 2;
  document.querySelectorAll<HTMLElement>('.story-step').forEach((step, index) => {
    step.classList.toggle('is-active', index === activeStep);
  });
  const progressBar = document.querySelector<HTMLElement>('.progress-track i');
  if (progressBar) progressBar.style.transform = `scaleX(${Math.max(0.06, progress)})`;
  const progressNumber = document.querySelector<HTMLElement>('.progress-label strong');
  if (progressNumber) progressNumber.textContent = String(activeStep + 1).padStart(2, '0');
}

function onScroll(): void {
  scrollTarget = storyProgressFromScroll();
  updateStoryInterface(scrollTarget);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 720 ? 1.5 : 1.8));
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function hitCountry(event: PointerEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(pickMeshes, false);
  const next = intersections.length ? recordByMesh.get(intersections[0].object) ?? null : null;
  if (!next || next.name === hoveredCountry?.name) return;
  hoveredCountry = next;
  chooseCountry(next);
}
renderer.domElement.addEventListener('pointermove', (event) => {
  isPointerInsideGlobe = true;
  hitCountry(event);
});
renderer.domElement.addEventListener('pointerleave', () => {
  isPointerInsideGlobe = false;
  hoveredCountry = null;
});
renderer.domElement.addEventListener('click', hitCountry);

const clock = new THREE.Clock();
const cameraTarget = new THREE.Vector3();
function animate(): void {
  const elapsed = clock.getElapsedTime();
  scrollProgress += (scrollTarget - scrollProgress) * 0.035;
  const progress = THREE.MathUtils.smoothstep(scrollProgress, 0, 1);
  const mobile = window.innerWidth < 720;
  const zoomIn = THREE.MathUtils.smoothstep(progress, 0, 0.48);
  const zoomOut = THREE.MathUtils.smoothstep(progress, 0.43, 1);
  const focusX = mobile ? 0.02 : THREE.MathUtils.lerp(1.26, 0.92, zoomOut);
  const focusY = mobile ? -0.47 : 0.03;
  const scale = (mobile ? 0.78 : 1) * (1 + zoomIn * 0.06 - zoomOut * 0.16);
  globe.position.set(focusX, focusY, 0);
  globe.scale.setScalar(scale);
  globe.rotation.y = Math.PI * 0.1 + elapsed * 0.034 + progress * 0.23;
  globe.rotation.x = -0.055 + Math.sin(elapsed * 0.13) * 0.018;
  orbit.rotation.z = -0.23 + elapsed * 0.012;
  camera.position.z = 4.45 - zoomIn * 0.78 + zoomOut * 1.73;
  earthMaterial.opacity = 1 - progress;
  oceanShell.material.opacity = progress * 0.74;
  cameraTarget.set(0, 0, 0);
  camera.lookAt(cameraTarget);
  const spread = progress * progress * 0.76;
  for (const record of countryRecords) {
    const hash = [...record.name].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
    const variation = 0.72 + (hash % 100) / 310;
    record.mesh.material.opacity = progress;
    record.group.position.copy(record.centroid).multiplyScalar(spread * variation);
    record.group.rotation.set(0, 0, 0);
  }
  if (isPointerInsideGlobe && renderer.domElement.matches(':hover')) {
    raycaster.setFromCamera(pointer, camera);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

renderWeather();
if (selectedCountry) chooseCountry(selectedCountry);
requestAnimationFrame(animate);
