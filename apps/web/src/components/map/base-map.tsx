'use client';

/**
 * BaseMap — MapLibre GL instance with basemap switching, coordinate readout,
 * scale and fullscreen control. Parents receive the raw map via onLoad for
 * imperative layer / marker / fly-to control.
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';

import { BASEMAP_LIST, BASEMAPS, type BasemapId } from '@/lib/map/styles';
import { cn, formatCoord } from '@/lib/utils';

export interface BaseMapProps {
  center?: [number, number];
  zoom?: number;
  basemap?: BasemapId;
  onBasemapChange?: (id: BasemapId) => void;
  onLoad?: (map: MapLibreMap) => void;
  onMouseMove?: (coord: [number, number] | null) => void;
  onClick?: (coord: [number, number]) => void;
  onDblClick?: (coord: [number, number]) => void;
  onContextMenu?: (coord: [number, number]) => void;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
  showControls?: boolean;
}

export function BaseMap({
  center = [78.0, 15.5],
  zoom = 5,
  basemap = 'dark',
  onBasemapChange,
  onLoad,
  onMouseMove,
  onClick,
  onDblClick,
  onContextMenu,
  interactive = true,
  className,
  children,
  showControls = true,
}: BaseMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  /* keep latest callbacks without re-creating the map */
  const handlers = useRef({ onLoad, onMouseMove, onClick, onDblClick, onContextMenu });
  useEffect(() => {
    handlers.current = { onLoad, onMouseMove, onClick, onDblClick, onContextMenu };
  });

  /* create map once */
  useEffect(() => {
    let disposed = false;

    const init = async () => {
      let gl: typeof import('maplibre-gl');
      try {
        gl = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
      } catch {
        if (!disposed) setFailed('MapLibre GL failed to load.');
        return;
      }
      if (!containerRef.current || disposed) return;

      const style = BASEMAPS[basemap].style;

      const instance = new gl.Map({
        container: containerRef.current,
        style: style as never,
        center,
        zoom,
        attributionControl: false,
        interactive,
        fadeDuration: 150,
      });
      mapRef.current = instance;

      instance.addControl(new gl.NavigationControl({ showCompass: true, visualizePitch: false }), 'top-right');
      instance.addControl(new gl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
      instance.addControl(new gl.AttributionControl({ compact: true }));

      instance.on('load', () => {
        if (disposed) return;
        setReady(true);
        handlers.current.onLoad?.(instance);
      });
      instance.on('mousemove', (e: MapMouseEvent) => {
        const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        setHover(coord);
        handlers.current.onMouseMove?.(coord);
      });
      instance.on('click', (e: MapMouseEvent) => handlers.current.onClick?.([e.lngLat.lng, e.lngLat.lat]));
      instance.on('dblclick', (e: MapMouseEvent) => {
        handlers.current.onDblClick?.([e.lngLat.lng, e.lngLat.lat]);
      });
      instance.on('contextmenu', (e: MapMouseEvent) => handlers.current.onContextMenu?.([e.lngLat.lng, e.lngLat.lat]));
    };

    void init();

    return () => {
      disposed = true;
      setReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* basemap switch */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const def = BASEMAPS[basemap];
    const styleUrl = typeof def.style === 'string' ? def.style : null;
    if (styleUrl) {
      map.setStyle(styleUrl);
    } else {
      map.setStyle(def.style as never);
    }
    map.once('style.load', () => {
      handlers.current.onLoad?.(map);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-void', className)} ref={containerRef}>
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center text-[12.5px] text-danger">{failed}</div>
      )}

      {!ready && !failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-void">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Loading map tiles…</p>
          </div>
        </div>
      )}

      {showControls && (
        <>
          {/* basemap switcher */}
          <div className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border border-line bg-surface/95 backdrop-blur">
            {BASEMAP_LIST.map((b) => (
              <button
                key={b.id}
                onClick={() => onBasemapChange?.(b.id)}
                className={cn(
                  'px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors',
                  b.id === basemap ? 'bg-primary/15 text-primary' : 'text-ink-faint hover:text-ink',
                )}
                aria-pressed={b.id === basemap}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* coordinate readout */}
          <div className="pointer-events-none absolute right-14 top-3 z-10 rounded-md border border-line bg-surface/90 px-2 py-1 font-mono text-[10px] text-ink-dim backdrop-blur">
            {hover ? formatCoord(hover) : '—.——° N, —.——° E'}
          </div>
        </>
      )}

      {children}
    </div>
  );
}

/** Imperative helpers used by workspace + region picker. */
export function upsertGeoJsonLayer(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.Feature | GeoJSON.FeatureCollection,
  options: { fill?: string; line?: string; fillOpacity?: number; lineWidth?: number; beforeId?: string },
): void {
  const source = map.getSource(sourceId) as { setData: (d: unknown) => void } | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(sourceId, { type: 'geojson', data: data as never });
    if (options.fill) {
      map.addLayer(
        {
          id: `${sourceId}:fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': options.fill,
            'fill-opacity': options.fillOpacity ?? 0.25,
          },
        },
        options.beforeId,
      );
    }
    if (options.line) {
      map.addLayer(
        {
          id: `${sourceId}:line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': options.line,
            'line-width': options.lineWidth ?? 1.6,
            'line-opacity': 0.9,
          },
        },
        options.beforeId,
      );
    }
  }
}
