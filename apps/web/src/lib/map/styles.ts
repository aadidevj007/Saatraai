/** Basemap styles — raster providers used without API keys; attribution preserved. */

export type BasemapId = 'satellite' | 'dark' | 'street' | 'terrain';

type StyleLike = string | Record<string, unknown>;

interface BasemapDef {
  id: BasemapId;
  label: string;
  style: StyleLike;
  /** Attribution line shown on the map. */
  attribution: string;
}

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    attribution: 'Esri World Imagery',
    style: {
      version: 8,
      sources: {
        esri: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          maxzoom: 18,
          attribution: 'Esri World Imagery',
        },
      },
      layers: [{ id: 'esri-imagery', type: 'raster', source: 'esri' }],
    },
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    attribution: '© OpenStreetMap © CARTO',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  street: {
    id: 'street',
    label: 'Street',
    attribution: '© OpenStreetMap © CARTO',
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  terrain: {
    id: 'terrain',
    label: 'Terrain',
    attribution: '© OpenTopoMap (CC-BY-SA) © OpenStreetMap',
    style: {
      version: 8,
      sources: {
        opentopo: {
          type: 'raster',
          tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 17,
          attribution: '© OpenTopoMap (CC-BY-SA) © OpenStreetMap',
        },
      },
      layers: [{ id: 'opentopo', type: 'raster', source: 'opentopo' }],
    },
  },
};

export const BASEMAP_LIST = Object.values(BASEMAPS);
