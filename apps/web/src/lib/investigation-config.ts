/** Per-investigation wizard configuration, persisted locally and carried into reports. */

import type { LngLat } from '@/lib/utils';

export type EvidenceSourceKind =
  | 'optical'
  | 'sar'
  | 'rainfall'
  | 'dem'
  | 'landcover'
  | 'vegetation'
  | 'infrastructure';

export type InvestigationMode = 'demo' | 'real';
export type EvidenceStrictness = 'standard' | 'strict' | 'research';
export type AnalysisDepth = 'fast' | 'balanced' | 'deep';

export interface RegionSelection {
  name: string;
  polygon: LngLat[];
  source: 'draw' | 'preset' | 'search' | 'geojson' | 'bounding-box';
}

export interface InvestigationConfig {
  investigationId: string;
  question: string;
  region: RegionSelection;
  timeRange: { start: string; end: string };
  sources: EvidenceSourceKind[];
  mode: InvestigationMode;
  strictness: EvidenceStrictness;
  depth: AnalysisDepth;
  createdAt: string;
}

const CONFIGS_KEY = 'saatraai.investigation-configs';

function readAll(): Record<string, InvestigationConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CONFIGS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, InvestigationConfig>) : {};
  } catch {
    return {};
  }
}

export function saveInvestigationConfig(config: InvestigationConfig): void {
  const all = readAll();
  all[config.investigationId] = config;
  window.localStorage.setItem(CONFIGS_KEY, JSON.stringify(all));
}

export function getInvestigationConfig(id: string): InvestigationConfig | null {
  return readAll()[id] ?? null;
}

export function listInvestigationConfigs(): InvestigationConfig[] {
  return Object.values(readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function removeInvestigationConfig(id: string): void {
  const all = readAll();
  delete all[id];
  window.localStorage.setItem(CONFIGS_KEY, JSON.stringify(all));
}
