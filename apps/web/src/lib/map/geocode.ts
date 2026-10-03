/**
 * Location search via the public Nominatim (OpenStreetMap) geocoder.
 * No API key required. If the request fails (offline, blocked, rate
 * limited) callers must surface an honest error — never silently fall
 * back to pretending the place exists.
 */

import type { LngLat } from '@/lib/utils';

export interface GeocodeResult {
  id: string;
  name: string;
  subtitle: string;
  /** Polygon ring in [lng, lat] order (from the result bounding box). */
  polygon: LngLat[];
  center: LngLat;
}

interface NominatimPlace {
  place_id: number;
  display_name: string;
  type?: string;
  class?: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

/** True when the query looks like plain text rather than "lat, lng" coordinates. */
export function isPlaceQuery(query: string): boolean {
  return query.trim().length >= 3 && !/^-?\d+(\.\d+)?\s*[, ]\s*-?\d+(\.\d+)?$/.test(query.trim());
}

export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    limit: '5',
    addressdetails: '0',
  });
  const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Geocoder returned HTTP ${response.status}`);
  }
  const places = (await response.json()) as NominatimPlace[];
  return places.map((place) => {
    const center: LngLat = [Number(place.lon), Number(place.lat)];
    let polygon: LngLat[];
    const bb = place.boundingbox;
    if (bb && bb.length === 4) {
      const south = Number(bb[0]);
      const north = Number(bb[1]);
      const west = Number(bb[2]);
      const east = Number(bb[3]);
      polygon = [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
      ];
    } else {
      const half = 0.25;
      polygon = [
        [center[0] - half, center[1] - half],
        [center[0] + half, center[1] - half],
        [center[0] + half, center[1] + half],
        [center[0] - half, center[1] + half],
      ];
    }
    return {
      id: `osm-${place.place_id}`,
      name: place.display_name.split(',').slice(0, 2).join(',').trim() || place.display_name,
      subtitle: `${place.type ?? 'place'} · ${place.display_name}`,
      polygon,
      center,
    };
  });
}
