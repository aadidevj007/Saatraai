'use client';

/**
 * RegionPicker — search presets/coordinates, draw polygon or rectangle,
 * upload GeoJSON, edit vertices by dragging, ROI statistics.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import {
  Box,
  Check,
  Crosshair,
  MapPinned,
  Spline,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';

import { BaseMap, upsertGeoJsonLayer } from '@/components/map/base-map';
import { Button, Input, Select } from '@/components/ui';
import { geocode, isPlaceQuery, type GeocodeResult } from '@/lib/map/geocode';
import { parseCoordinate, REGION_PRESETS, searchRegions } from '@/lib/map/regions';
import type { BasemapId } from '@/lib/map/styles';
import { readSettings, saveSettings } from '@/lib/settings';
import type { RegionSelection } from '@/lib/investigation-config';
import { bbox, centroid, formatCoord, formatNumber, polygonAreaKm2, type LngLat } from '@/lib/utils';
import { useToast } from '@/lib/state/toast';

type DrawMode = 'polygon' | 'rectangle' | null;

export function RegionPicker({
  value,
  onChange,
  height = 420,
}: {
  value: RegionSelection | null;
  onChange: (selection: RegionSelection | null) => void;
  height?: number;
}) {
  const { toast } = useToast();
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const draggingRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemapState] = useState<BasemapId>('satellite');
  const setBasemap = (next: BasemapId) => {
    setBasemapState(next);
    saveSettings({ defaultBasemap: next });
  };
  const [mode, setMode] = useState<DrawMode>(null);
  const [pending, setPending] = useState<LngLat[]>([]); // in-progress vertices
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [placeResults, setPlaceResults] = useState<GeocodeResult[] | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const polygon = value?.polygon ?? null;
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  /* restore saved basemap preference */
  useEffect(() => {
    const t = window.setTimeout(() => setBasemapState(readSettings().defaultBasemap), 0);
    return () => window.clearTimeout(t);
  }, []);

  const applyPolygon = useCallback(
    (points: LngLat[], source: RegionSelection['source'], name: string) => {
      if (points.length < 3) return;
      onChange({ name, polygon: points, source });
    },
    [onChange],
  );

  /* draw preview source */
  const renderPreview = useCallback((points: LngLat[], closed: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const coords = closed && points.length >= 3 ? [...points, points[0]] : points;
    upsertGeoJsonLayer(map, 'roi-preview', {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    }, { line: '#22d3ee', lineWidth: 2 });
  }, []);

  const clearPreview = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getSource('roi-preview')) {
      upsertGeoJsonLayer(map, 'roi-preview', { type: 'FeatureCollection', features: [] }, { line: '#22d3ee' });
    }
  }, []);

  /* committed polygon layer */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (polygon && polygon.length >= 3) {
      upsertGeoJsonLayer(
        map,
        'roi-polygon',
        {
          type: 'Feature',
          properties: { name: value?.name ?? 'ROI' },
          geometry: { type: 'Polygon', coordinates: [[...polygon, polygon[0]]] },
        },
        { fill: '#22d3ee', line: '#22d3ee', fillOpacity: 0.16, lineWidth: 2 },
      );
      const [minLng, minLat, maxLng, maxLat] = bbox(polygon);
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 70, duration: 600, maxZoom: 12 },
      );
    } else if (map.getSource('roi-polygon')) {
      upsertGeoJsonLayer(map, 'roi-polygon', { type: 'FeatureCollection', features: [] }, { fill: '#22d3ee' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, value?.name]);

  /* draggable vertex markers (created only when count changes) */
  const vertexCount = polygon?.length ?? 0;
  useEffect(() => {
    const cancelled = { current: false };
    const map = mapRef.current;
    if (!map || !mapReady || !polygon) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      return;
    }
    if (markersRef.current.length !== polygon.length) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      void (async () => {
        const gl = await import('maplibre-gl');
        if (cancelled.current || !mapRef.current) return;
        const current = polygon;
        current.forEach((pt, index) => {
          const el = document.createElement('div');
          el.style.width = '10px';
          el.style.height = '10px';
          el.style.borderRadius = '50%';
          el.style.background = '#22d3ee';
          el.style.border = '2px solid #05080d';
          el.style.cursor = 'grab';
          const marker = new gl.Marker({ draggable: true, element: el, anchor: 'center' })
            .setLngLat(pt)
            .addTo(mapRef.current as MapLibreMap);
          marker.on('drag', () => {
            draggingRef.current = true;
            const ll = marker.getLngLat();
            const current = valueRef.current;
            if (!current) return;
            const points = current.polygon.map((p, i) => (i === index ? ([ll.lng, ll.lat] as LngLat) : p));
            onChange({ ...current, polygon: points, source: 'draw' });
          });
          marker.on('dragend', () => {
            draggingRef.current = false;
          });
          markersRef.current.push(marker);
        });
      })();
    }

    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, vertexCount, Boolean(polygon)]);

  useEffect(
    () => () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    },
    [],
  );

  /* keep marker positions in sync when the polygon changes externally (preset/upload) */
  useEffect(() => {
    if (!polygon || draggingRef.current) return;
    markersRef.current.forEach((marker, index) => {
      const point = polygon[index];
      if (!point) return;
      const current = marker.getLngLat();
      if (Math.abs(current.lng - point[0]) > 1e-9 || Math.abs(current.lat - point[1]) > 1e-9) {
        marker.setLngLat(point);
      }
    });
  }, [polygon]);

  /* map click routing */
  const handleMapClick = useCallback(
    (coord: LngLat) => {
      if (mode === 'polygon') {
        setPending((prev) => {
          const next = [...prev, coord];
          renderPreview(next, false);
          return next;
        });
      } else if (mode === 'rectangle') {
        setPending((prev) => {
          if (prev.length === 0) {
            renderPreview([coord], false);
            return [coord];
          }
          const a = prev[0];
          const rect: LngLat[] = [
            [a[0], a[1]],
            [coord[0], a[1]],
            [coord[0], coord[1]],
            [a[0], coord[1]],
          ];
          setMode(null);
          applyPolygon(rect, 'bounding-box', `Rectangle @ ${formatCoord(coord)}`);
          return [];
        });
      }
    },
    [mode, renderPreview, applyPolygon],
  );

  const finishPolygon = useCallback(() => {
    if (pending.length < 3) {
      toast({ variant: 'warning', title: 'Need at least 3 vertices', description: 'Click the map to add vertices, then finish.' });
      return;
    }
    applyPolygon(pending, 'draw', `Drawn polygon (${pending.length} vertices)`);
    setPending([]);
    setMode(null);
    clearPreview();
  }, [pending, applyPolygon, toast, clearPreview]);

  const undoVertex = useCallback(() => {
    setPending((prev) => {
      const next = prev.slice(0, -1);
      renderPreview(next, false);
      if (next.length === 0) clearPreview();
      return next;
    });
  }, [renderPreview, clearPreview]);

  const clearAll = useCallback(() => {
    setPending([]);
    setMode(null);
    clearPreview();
    onChange(null);
  }, [clearPreview, onChange]);

  const applyPreset = useCallback(
    (id: string) => {
      const preset = REGION_PRESETS.find((p) => p.id === id);
      if (!preset) return;
      setSearchOpen(false);
      setSearch('');
      setPending([]);
      setMode(null);
      clearPreview();
      onChange({ name: preset.name, polygon: preset.polygon, source: 'preset' });
    },
    [onChange, clearPreview],
  );

  const applyPlace = useCallback(
    (result: GeocodeResult) => {
      setPending([]);
      setMode(null);
      clearPreview();
      onChange({ name: result.name, polygon: result.polygon, source: 'search' });
      setSearchOpen(false);
      toast({ variant: 'success', title: 'Location found', description: result.subtitle });
    },
    [onChange, clearPreview, toast],
  );

  const runSearch = useCallback(async () => {
    const coord = parseCoordinate(search);
    if (coord) {
      const half = 0.25;
      const ring: LngLat[] = [
        [coord.center[0] - half, coord.center[1] - half],
        [coord.center[0] + half, coord.center[1] - half],
        [coord.center[0] + half, coord.center[1] + half],
        [coord.center[0] - half, coord.center[1] + half],
      ];
      setPlaceResults(null);
      onChange({ name: coord.name, polygon: ring, source: 'search' });
      setSearchOpen(false);
      toast({ variant: 'success', title: 'Coordinate region set', description: coord.name });
      return;
    }
    const hits = searchRegions(search);
    if (hits.length > 0) {
      setPlaceResults(null);
      applyPreset(hits[0].id);
      return;
    }
    if (!isPlaceQuery(search)) {
      toast({ variant: 'warning', title: 'Nothing to search', description: 'Enter a place name, coordinates, or draw the region.' });
      return;
    }
    /* real geocoder lookup — surface failures honestly */
    setGeocoding(true);
    try {
      const results = await geocode(search);
      setPlaceResults(results);
      setSearchOpen(true);
      if (results.length === 0) {
        toast({ variant: 'warning', title: 'No location match', description: `Geocoder returned no results for “${search.trim()}”.` });
      }
    } catch (error) {
      setPlaceResults(null);
      toast({
        variant: 'error',
        title: 'Location search unavailable',
        description: error instanceof Error ? error.message : 'Geocoder request failed — check network connectivity.',
      });
    } finally {
      setGeocoding(false);
    }
  }, [search, onChange, applyPreset, toast]);

  const handleGeoJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as {
          type: string;
          geometry?: { type: string; coordinates: unknown };
          features?: Array<{ geometry?: { type: string; coordinates: unknown } }>;
        };
        let ring: LngLat[] | null = null;
        const extract = (geometry?: { type?: string; coordinates?: unknown }) => {
          if (!geometry) return null;
          if (geometry.type === 'Polygon') {
            const coords = geometry.coordinates as number[][][];
            return coords[0].map(([lng, lat]) => [lng, lat] as LngLat);
          }
          if (geometry.type === 'MultiPolygon') {
            const coords = geometry.coordinates as number[][][][];
            return coords[0][0].map(([lng, lat]) => [lng, lat] as LngLat);
          }
          return null;
        };
        if (parsed.type === 'FeatureCollection') {
          for (const feature of parsed.features ?? []) {
            ring = extract(feature.geometry) ?? ring;
            if (ring) break;
          }
        } else if (parsed.type === 'Feature') {
          ring = extract(parsed.geometry);
        } else {
          ring = extract(parsed);
        }
        if (!ring || ring.length < 3) {
          throw new Error('No Polygon geometry found in file');
        }
        onChange({ name: file.name, polygon: ring, source: 'geojson' });
        toast({ variant: 'success', title: 'GeoJSON region loaded', description: `${ring.length} vertices from ${file.name}` });
      } catch (error) {
        toast({ variant: 'error', title: 'GeoJSON parse failed', description: error instanceof Error ? error.message : 'Invalid file' });
      }
    },
    [onChange, toast],
  );

  const matches = search.trim() && !placeResults ? searchRegions(search) : [];
  const area = polygon ? polygonAreaKm2(polygon) : null;
  const center = polygon ? centroid(polygon) : null;
  const box = polygon ? bbox(polygon) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <MapPinned className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPlaceResults(null);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="Search any place, coordinates, or presets"
            className="pl-9"
            aria-label="Search region"
          />
          {searchOpen && geocoding && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border border-line-strong bg-elevated px-3 py-2 font-mono text-[11px] text-ink-faint shadow-xl">
              Searching OpenStreetMap…
            </div>
          )}
          {searchOpen && matches.length > 0 && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line-strong bg-elevated shadow-xl">
              {matches.map((m) => (
                <button
                  key={m.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyPreset(m.id);
                  }}
                  className="block w-full px-3 py-2 text-left transition-colors hover:bg-card"
                >
                  <div className="text-[12.5px] text-ink">{m.name}</div>
                  <div className="font-mono text-[10px] text-ink-faint">{m.subtitle}</div>
                </button>
              ))}
            </div>
          )}
          {searchOpen && placeResults && placeResults.length > 0 && (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line-strong bg-elevated shadow-xl">
              {placeResults.map((r) => (
                <button
                  key={r.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyPlace(r);
                  }}
                  className="block w-full px-3 py-2 text-left transition-colors hover:bg-card"
                >
                  <div className="text-[12.5px] text-ink">{r.name}</div>
                  <div className="truncate font-mono text-[10px] text-ink-faint" title={r.subtitle}>
                    {r.subtitle}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant={mode === 'polygon' ? 'primary' : 'secondary'}
          icon={<Spline className="h-3.5 w-3.5" />}
          onClick={() => {
            setMode((m) => (m === 'polygon' ? null : 'polygon'));
            setPending([]);
            clearPreview();
          }}
        >
          Draw polygon
        </Button>
        <Button
          size="sm"
          variant={mode === 'rectangle' ? 'primary' : 'secondary'}
          icon={<Box className="h-3.5 w-3.5" />}
          onClick={() => {
            setMode((m) => (m === 'rectangle' ? null : 'rectangle'));
            setPending([]);
            clearPreview();
          }}
        >
          Rectangle
        </Button>

        <Select
          value=""
          onChange={(e) => e.target.value && applyPreset(e.target.value)}
          className="w-44"
          aria-label="Region presets"
        >
          <option value="">Region presets…</option>
          {REGION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <label className="inline-flex">
          <input
            type="file"
            accept=".geojson,.json,application/geo+json,application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleGeoJson(file);
              e.target.value = '';
            }}
          />
          <span className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-[12px] text-ink-dim transition-colors hover:border-primary/50 hover:text-primary">
            <Upload className="h-3.5 w-3.5" /> GeoJSON
          </span>
        </label>

        {polygon && (
          <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={clearAll}>
            Clear
          </Button>
        )}
      </div>

      {/* drawing hint */}
      {mode && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] text-ink-dim">
          <Crosshair className="h-3.5 w-3.5 text-primary" />
          {mode === 'polygon'
            ? 'Click to add vertices · finish when the shape is closed'
            : 'Click two opposite corners to define the rectangle'}
          {mode === 'polygon' && (
            <>
              <Button size="sm" variant="primary" className="ml-auto" icon={<Check className="h-3.5 w-3.5" />} onClick={finishPolygon}>
                Finish
              </Button>
              <Button size="sm" variant="ghost" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={undoVertex} disabled={pending.length === 0}>
                Undo
              </Button>
            </>
          )}
        </div>
      )}

      {/* map */}
      <div className="overflow-hidden rounded-xl border border-line" style={{ height }}>
        <BaseMap
          basemap={basemap}
          onBasemapChange={setBasemap}
          zoom={polygon ? 8 : 4}
          center={polygon ? centroid(polygon) : [78.0, 22.5]}
          onLoad={(map) => {
            mapRef.current = map;
            setMapReady(true);
          }}
          onClick={handleMapClick}
          onDblClick={() => mode === 'polygon' && finishPolygon()}
        />

        {mode && (
          <div className="pointer-events-none absolute inset-0 z-[5]" style={{ cursor: 'crosshair' }} />
        )}
      </div>

      {/* stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Area" value={area !== null ? `${formatNumber(area, area > 10 ? 0 : 2)} km²` : '—'} />
        <Stat label="Centroid" value={center ? formatCoord(center) : '—'} />
        <Stat label="Bounding box" value={box ? `${box.map((v) => v.toFixed(3)).join(', ')}` : '—'} />
        <Stat label="Vertices" value={polygon ? String(polygon.length) : '—'} />
      </div>
      {value && (
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
          source: {value.source} · {value.name}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[12px] text-ink" title={value}>
        {value}
      </div>
    </div>
  );
}
