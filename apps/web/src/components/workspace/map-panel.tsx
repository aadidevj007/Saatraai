'use client';

/** Workspace map: ROI, scene footprints, evidence markers, scene comparison. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Layers, MapPin, SplitSquareHorizontal } from 'lucide-react';

import { BaseMap, upsertGeoJsonLayer } from '@/components/map/base-map';
import { Badge, Slider } from '@/components/ui';
import type { EvidenceRecord, IngestedImage } from '@/lib/api/types';
import type { RegionSelection } from '@/lib/investigation-config';
import type { TimelineEvent } from '@/lib/analysis/timeline';
import type { BasemapId } from '@/lib/map/styles';
import { readSettings, saveSettings } from '@/lib/settings';
import { formatCoord, round, type LngLat } from '@/lib/utils';

export interface MapPanelProps {
  region: RegionSelection | null;
  images: IngestedImage[];
  evidence: EvidenceRecord[];
  selectedEvent: TimelineEvent | null;
  selectedEvidence: EvidenceRecord | null;
}

interface LayerDef {
  id: 'roi' | 'footprints' | 'markers';
  label: string;
  color: string;
  visible: boolean;
  opacity: number;
}

/** Tolerant bounds reader (ingestion stores left/bottom/right/top). */
export function readBounds(image: IngestedImage): [number, number, number, number] | null {
  const b = image.bounds as Record<string, number> | null;
  if (!b) return null;
  if (typeof b.left === 'number' && typeof b.right === 'number') {
    return [b.left, b.bottom, b.right, b.top];
  }
  if (typeof b.xmin === 'number') return [b.xmin, b.ymin ?? b.xmin, b.xmax ?? b.xmin, b.ymax ?? b.xmin];
  if (typeof b.west === 'number') return [b.west, b.south ?? b.west, b.east ?? b.west, b.north ?? b.west];
  return null;
}

function boundsPolygon(bounds: [number, number, number, number]): LngLat[] {
  const [w, s, e, n] = bounds;
  return [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
  ];
}

function polygonFeature(ring: LngLat[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
  };
}

export function MapPanel({ region, images, evidence, selectedEvent, selectedEvidence }: MapPanelProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [basemap, setBasemapState] = useState<BasemapId>('satellite');
  const setBasemap = (next: BasemapId) => {
    setBasemapState(next);
    saveSettings({ defaultBasemap: next });
  };
  const [layers, setLayers] = useState<LayerDef[]>([
    { id: 'roi', label: 'Region of interest', color: '#22d3ee', visible: true, opacity: 0.16 },
    { id: 'footprints', label: 'Scene footprints', color: '#2dd4bf', visible: true, opacity: 0.2 },
    { id: 'markers', label: 'Evidence markers', color: '#f59e0b', visible: true, opacity: 0.9 },
  ]);
  const [compareAOverride, setCompareAOverride] = useState<string | null>(null);
  const [compareBOverride, setCompareBOverride] = useState<string | null>(null);
  const [compareOpacity, setCompareOpacity] = useState(0.5);

  const drawableImages = useMemo(() => images.map((img) => ({ img, bounds: readBounds(img) })).filter((x) => x.bounds), [images]);

  /* restore saved basemap preference */
  useEffect(() => {
    const t = window.setTimeout(() => setBasemapState(readSettings().defaultBasemap), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* defaults: first two acquisitions, overridable by the user */
  const compareA = compareAOverride ?? drawableImages[0]?.img.id ?? '';
  const compareB = compareBOverride ?? drawableImages[1]?.img.id ?? '';

  const layerState = (id: LayerDef['id']) => layers.find((l) => l.id === id)!;
  const toggle = (id: LayerDef['id']) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  const setOpacity = (id: LayerDef['id'], opacity: number) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, opacity } : l)));

  /* render all vector layers whenever inputs change */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // ROI
    if (region && region.polygon.length >= 3) {
      const roi = layerState('roi');
      upsertGeoJsonLayer(map, 'ws-roi', polygonFeature(region.polygon), {
        fill: roi.color,
        line: roi.color,
        fillOpacity: roi.visible ? roi.opacity : 0,
        lineWidth: 1.8,
      });
      if (map.getLayer('ws-roi:fill')) map.setPaintProperty('ws-roi:fill', 'fill-opacity', roi.visible ? roi.opacity : 0);
      if (map.getLayer('ws-roi:line')) map.setPaintProperty('ws-roi:line', 'line-opacity', roi.visible ? 0.9 : 0);
    } else if (map.getSource('ws-roi')) {
      upsertGeoJsonLayer(map, 'ws-roi', { type: 'FeatureCollection', features: [] }, {});
      if (map.getLayer('ws-roi:fill')) map.setPaintProperty('ws-roi:fill', 'fill-opacity', 0);
      if (map.getLayer('ws-roi:line')) map.setPaintProperty('ws-roi:line', 'line-opacity', 0);
    }

    // scene footprints
    const fp = layerState('footprints');
    const footprintFeatures = drawableImages.map(({ bounds }) => polygonFeature(boundsPolygon(bounds as [number, number, number, number])));
    upsertGeoJsonLayer(map, 'ws-footprints', { type: 'FeatureCollection', features: footprintFeatures }, {
      fill: fp.color,
      line: fp.color,
      fillOpacity: fp.visible ? fp.opacity : 0,
      lineWidth: 1.2,
    });
    if (map.getLayer('ws-footprints:fill')) map.setPaintProperty('ws-footprints:fill', 'fill-opacity', fp.visible ? fp.opacity : 0);
    if (map.getLayer('ws-footprints:line')) map.setPaintProperty('ws-footprints:line', 'line-opacity', fp.visible ? 0.8 : 0);

    // evidence markers (centroid of the scene each evidence item references)
    const mk = layerState('markers');
    const imageById = new Map(images.map((i) => [i.id, i]));
    const markerFeatures: GeoJSON.Feature[] = [];
    for (const item of evidence) {
      const image = item.image_id ? imageById.get(item.image_id) : undefined;
      const bounds = image ? readBounds(image) : null;
      if (!bounds) continue;
      markerFeatures.push({
        type: 'Feature',
        properties: { id: item.id, polarity: item.polarity, summary: item.summary.slice(0, 120) },
        geometry: {
          type: 'Point',
          coordinates: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
        },
      });
    }
    const markerSource = map.getSource('ws-markers') as { setData: (d: unknown) => void } | undefined;
    if (markerSource) {
      markerSource.setData({ type: 'FeatureCollection', features: markerFeatures });
    } else {
      map.addSource('ws-markers', { type: 'geojson', data: { type: 'FeatureCollection', features: markerFeatures } });
      map.addLayer({
        id: 'ws-markers:circle',
        type: 'circle',
        source: 'ws-markers',
        paint: {
          'circle-color': [
            'match',
            ['get', 'polarity'],
            'supporting', '#34d399',
            'contradicting', '#f43f5e',
            'insufficient', '#f59e0b',
            '#93a7bc',
          ],
          'circle-radius': 6,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#05080d',
        },
      });
    }
    if (map.getLayer('ws-markers:circle')) {
      map.setLayoutProperty('ws-markers:circle', 'visibility', mk.visible ? 'visible' : 'none');
    }

    // comparison pair highlight
    const a = drawableImages.find((x) => x.img.id === compareA);
    const b = drawableImages.find((x) => x.img.id === compareB);
    const compareFeatures: GeoJSON.Feature[] = [];
    if (a) compareFeatures.push(polygonFeature(boundsPolygon(a.bounds as [number, number, number, number])));
    upsertGeoJsonLayer(map, 'ws-compare-a', { type: 'FeatureCollection', features: compareFeatures }, {
      fill: '#22d3ee',
      line: '#22d3ee',
      fillOpacity: 0.0,
      lineWidth: 2.5,
    });
    const bFeatures: GeoJSON.Feature[] = [];
    if (b) bFeatures.push(polygonFeature(boundsPolygon(b.bounds as [number, number, number, number])));
    upsertGeoJsonLayer(map, 'ws-compare-b', { type: 'FeatureCollection', features: bFeatures }, {
      fill: '#f59e0b',
      line: '#f59e0b',
      fillOpacity: compareOpacity,
      lineWidth: 2.5,
    });
    if (map.getLayer('ws-compare-a:fill')) map.setPaintProperty('ws-compare-a:fill', 'fill-opacity', 0);
    if (map.getLayer('ws-compare-b:fill')) map.setPaintProperty('ws-compare-b:fill', 'fill-opacity', compareOpacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, drawableImages, evidence, layers, compareA, compareB, compareOpacity, images]);

  /* fly to a selected evidence item / timeline event */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const focus = (): LngLat | null => {
      if (selectedEvidence?.image_id) {
        const image = images.find((i) => i.id === selectedEvidence.image_id);
        const bounds = image ? readBounds(image) : null;
        if (bounds) return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
      }
      if (selectedEvent?.coordinates) return selectedEvent.coordinates;
      if (region && region.polygon.length) {
        const lngs = region.polygon.map((p) => p[0]);
        const lats = region.polygon.map((p) => p[1]);
        return [round((Math.min(...lngs) + Math.max(...lngs)) / 2, 4), round((Math.min(...lats) + Math.max(...lats)) / 2, 4)];
      }
      return null;
    };
    const target = focus();
    if (target) map.flyTo({ center: target, zoom: Math.max(map.getZoom(), 9), duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvidence?.id, selectedEvent?.id]);

  const imageById = (id: string) => images.find((i) => i.id === id);
  const aImage = imageById(compareA);
  const bImage = imageById(compareB);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        <BaseMap
          basemap={basemap}
          onBasemapChange={setBasemap}
          center={region && region.polygon.length ? centroidOf(region.polygon) : [78.0, 22.5]}
          zoom={region ? 7 : 4}
          onLoad={(map) => {
            mapRef.current = map;
            /* force layer re-render on style reload */
            setLayers((prev) => [...prev]);
          }}
        />

        {/* layer controls */}
        <div className="absolute right-3 top-14 z-10 w-56 rounded-lg border border-line bg-surface/95 p-3 backdrop-blur">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-dim">
            <Layers className="h-3.5 w-3.5" /> Layers
          </div>
          <div className="space-y-2.5">
            {layers.map((layer) => (
              <div key={layer.id}>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggle(layer.id)}
                    className="flex items-center gap-2 text-left text-[12px] text-ink-dim hover:text-ink"
                    aria-pressed={layer.visible}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm border"
                      style={{
                        borderColor: layer.color,
                        background: layer.visible ? layer.color : 'transparent',
                      }}
                    />
                    {layer.label}
                  </button>
                  <span className="font-mono text-[9.5px] text-ink-faint">{Math.round(layer.opacity * 100)}%</span>
                </div>
                {layer.visible && (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(layer.opacity * 100)}
                    onChange={(e) => setOpacity(layer.id, Number(e.target.value) / 100)}
                    className="mt-1 h-1 w-full cursor-pointer appearance-none rounded bg-[#16212e] accent-[#22d3ee]"
                    aria-label={`${layer.label} opacity`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-line pt-2 font-mono text-[9.5px] uppercase tracking-wider text-ink-faint">
            {drawableImages.length} scene footprint{drawableImages.length === 1 ? '' : 's'} · {evidence.filter((e) => e.image_id).length} evidence markers
          </div>
        </div>
      </div>

      {/* scene comparison strip */}
      <div className="shrink-0 border-t border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-dim">
            <SplitSquareHorizontal className="h-3.5 w-3.5" /> Temporal comparison
          </span>

          <select
            value={compareA}
            onChange={(e) => setCompareAOverride(e.target.value)}
            className="h-7 rounded-md border border-line bg-inputbg px-2 text-[12px] text-ink"
            aria-label="Scene A (before)"
          >
            <option value="">Scene A (before)…</option>
            {drawableImages.map(({ img }) => (
              <option key={img.id} value={img.id}>
                {img.acquisition_at?.slice(0, 10) ?? 'no date'} · {img.original_filename}
              </option>
            ))}
          </select>

          <span className="font-mono text-[10px] uppercase tracking-wider text-primary">vs</span>

          <select
            value={compareB}
            onChange={(e) => setCompareBOverride(e.target.value)}
            className="h-7 rounded-md border border-line bg-inputbg px-2 text-[12px] text-ink"
            aria-label="Scene B (after)"
          >
            <option value="">Scene B (after)…</option>
            {drawableImages.map(({ img }) => (
              <option key={img.id} value={img.id}>
                {img.acquisition_at?.slice(0, 10) ?? 'no date'} · {img.original_filename}
              </option>
            ))}
          </select>

          <div className="flex min-w-40 items-center gap-2">
            <span className="font-mono text-[9.5px] uppercase text-ink-faint">B opacity</span>
            <Slider value={compareOpacity} onChange={setCompareOpacity} ariaLabel="Scene B opacity" />
            <span className="w-8 font-mono text-[10px] text-ink-dim">{Math.round(compareOpacity * 100)}%</span>
          </div>

          {aImage && bImage && (
            <span className="font-mono text-[10px] text-ink-faint">
              Δ days = {Math.abs(Math.round((Date.parse(bImage.acquisition_at ?? '') - Date.parse(aImage.acquisition_at ?? '')) / 86_400_000)) || '?'}
            </span>
          )}
          <Badge tone="primary">CHANGE: footprints only</Badge>
        </div>

        {drawableImages.length < 2 ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
            <MapPin className="h-3 w-3" />
            Scene raster comparison requires at least two ingested scenes — scene rasters are not served by this
            deployment, so footprints and metadata drive the comparison.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10.5px] text-ink-faint">
            <span className="text-primary">A · {aImage?.original_filename} {aImage ? `(${aImage.width}×${aImage.height} · ${aImage.modality})` : ''}</span>
            <span className="text-warning">B · {bImage?.original_filename} {bImage ? `(${bImage.width}×${bImage.height} · ${bImage.modality})` : ''}</span>
            {aImage && (
              <span>
                A centroid {formatCoord([(readBounds(aImage)![0] + readBounds(aImage)![2]) / 2, (readBounds(aImage)![1] + readBounds(aImage)![3]) / 2])}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function centroidOf(ring: LngLat[]): LngLat {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
}
