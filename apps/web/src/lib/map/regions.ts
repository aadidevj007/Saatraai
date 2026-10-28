/** Built-in region presets — no geocoder is configured, so search covers these + coordinates. */

import type { LngLat } from '@/lib/utils';

export interface RegionPreset {
  id: string;
  name: string;
  subtitle: string;
  polygon: LngLat[];
  /** Preset focus point when the polygon is applied. */
  center: LngLat;
}

function box(center: LngLat, halfW: number, halfH: number): LngLat[] {
  const [lng, lat] = center;
  return [
    [lng - halfW, lat - halfH],
    [lng + halfW, lat - halfH],
    [lng + halfW, lat + halfH],
    [lng - halfW, lat + halfH],
  ];
}

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'virudhunagar',
    name: 'Virudhunagar District, Tamil Nadu',
    subtitle: '8.17°N 77.55°E · rain-shadow district',
    polygon: box([77.55, 9.17], 0.55, 0.5),
    center: [77.55, 9.17],
  },
  {
    id: 'chennai',
    name: 'Chennai Metropolitan, Tamil Nadu',
    subtitle: '13.08°N 80.27°E · coastal urban basin',
    polygon: box([80.27, 13.08], 0.45, 0.4),
    center: [80.27, 13.08],
  },
  {
    id: 'kochi',
    name: 'Kochi / Ernakulam, Kerala',
    subtitle: '9.93°N 76.26°E · lagoon coastline',
    polygon: box([76.26, 9.93], 0.42, 0.38),
    center: [76.26, 9.93],
  },
  {
    id: 'sundarbans',
    name: 'Sundarbans Delta, West Bengal',
    subtitle: '21.94°N 88.90°E · tidal mangrove delta',
    polygon: box([88.9, 21.94], 0.7, 0.5),
    center: [88.9, 21.94],
  },
  {
    id: 'brahmaputra',
    name: 'Brahmaputra Valley, Assam',
    subtitle: '26.14°N 91.74°E · braided floodplain',
    polygon: box([91.74, 26.14], 1.1, 0.4),
    center: [91.74, 26.14],
  },
  {
    id: 'vijayawada',
    name: 'Vijayawada Region, Andhra Pradesh',
    subtitle: '16.51°N 80.65°E · Krishna river delta',
    polygon: box([80.65, 16.51], 0.5, 0.45),
    center: [80.65, 16.51],
  },
  {
    id: 'mumbai',
    name: 'Mumbai Metropolitan, Maharashtra',
    subtitle: '19.08°N 72.88°E · coastal megacity',
    polygon: box([72.88, 19.08], 0.35, 0.42),
    center: [72.88, 19.08],
  },
  {
    id: 'mekong',
    name: 'Mekong Delta, Vietnam',
    subtitle: '10.03°N 105.79°E · rice delta',
    polygon: box([105.79, 10.03], 0.9, 0.6),
    center: [105.79, 10.03],
  },
  {
    id: 'nile',
    name: 'Nile Delta, Egypt',
    subtitle: '30.45°N 31.24°E · arid delta',
    polygon: box([31.24, 30.45], 0.9, 0.5),
    center: [31.24, 30.45],
  },
  {
    id: 'global',
    name: 'Global view',
    subtitle: 'Whole-earth context',
    polygon: [
      [-170, -55],
      [170, -55],
      [170, 75],
      [-170, 75],
    ],
    center: [10, 20],
  },
];

export function searchRegions(query: string): RegionPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return REGION_PRESETS;
  return REGION_PRESETS.filter(
    (r) => r.name.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q) || r.id.includes(q),
  );
}

/** Parse "lat, lng" / "lng, lat" style coordinate input into a point preset. */
export function parseCoordinate(query: string): { name: string; center: LngLat } | null {
  const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  let lng = b;
  let lat = a;
  if (Math.abs(a) <= 90 && Math.abs(b) > 90) {
    lat = a;
    lng = b;
  } else if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
    lng = a;
    lat = b;
  } else if (Math.abs(a) <= 90 && Math.abs(b) <= 90) {
    // ambiguous: treat first as latitude (common "lat, lng" convention)
    lat = a;
    lng = b;
  } else {
    return null;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { name: `Coordinate point ${lat.toFixed(4)}, ${lng.toFixed(4)}`, center: [lng, lat] };
}
