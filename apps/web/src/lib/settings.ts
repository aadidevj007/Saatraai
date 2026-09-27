/** Device-local application settings — wired into wizard defaults and map basemaps. */

import type { AnalysisDepth, EvidenceStrictness, InvestigationMode } from '@/lib/investigation-config';
import type { BasemapId } from '@/lib/map/styles';

export interface AppSettings {
  defaultBasemap: BasemapId;
  defaultMode: InvestigationMode;
  defaultStrictness: EvidenceStrictness;
  defaultDepth: AnalysisDepth;
}

const KEY = 'saatraai.settings';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultBasemap: 'satellite',
  defaultMode: 'real',
  defaultStrictness: 'standard',
  defaultDepth: 'balanced',
};

export function readSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...readSettings(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearLocalData(): void {
  const preserved = window.localStorage.getItem(KEY);
  window.localStorage.clear();
  if (preserved) window.localStorage.setItem(KEY, preserved);
}
