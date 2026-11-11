/**
 * NLP Extractor for Earth Observation queries.
 * Automatically identifies temporal boundaries (time ranges, year spans, relative durations),
 * geographic regions of interest (preset detection, place extraction, and bounding polygons),
 * and recommended sensor modalities (Optical, SAR, Rainfall, DEM, Landcover, etc.)
 * directly from natural language prompts.
 */

import { REGION_PRESETS, type RegionPreset } from '@/lib/map/regions';
import { geocode } from '@/lib/map/geocode';
import type { EvidenceSourceKind, RegionSelection } from '@/lib/investigation-config';
import type { LngLat } from '@/lib/utils';

export interface ExtractedTimeRange {
  start: string; // ISO date 'YYYY-MM-DD'
  end: string;   // ISO date 'YYYY-MM-DD'
  label: string;
  confidence: number;
}

export interface ExtractedRegion {
  name: string;
  rawText: string;
  source: RegionSelection['source'];
  polygon: LngLat[];
  center?: LngLat;
  confidence: number;
}

export interface NlpExtractionResult {
  hasMatches: boolean;
  timeRange: ExtractedTimeRange | null;
  region: ExtractedRegion | null;
  suggestedSources: EvidenceSourceKind[];
  inferredIntent: string | null;
  summary: string;
}

const MONTH_NAMES: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function formatIsoDate(year: number, monthIndex: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Parses time expressions from natural language.
 * Examples:
 *  - "between 2022 and 2026"
 *  - "from 2019 to 2024"
 *  - "since 2018"
 *  - "over the last 5 years" / "past 3 years"
 *  - "between August 2018 and September 2018"
 *  - "from 2024-05-01 to 2024-10-31"
 */
export function extractTimeRange(query: string): ExtractedTimeRange | null {
  const text = query.trim();
  const now = new Date();

  // Pattern 1: ISO Dates: YYYY-MM-DD to YYYY-MM-DD
  const isoPattern = /\b(\d{4}-\d{2}-\d{2})\b(?:\s*(?:to|and|through|until|–|-)\s*)\b(\d{4}-\d{2}-\d{2})\b/i;
  const isoMatch = isoPattern.exec(text);
  if (isoMatch) {
    return {
      start: isoMatch[1],
      end: isoMatch[2],
      label: `${isoMatch[1]} to ${isoMatch[2]}`,
      confidence: 0.98,
    };
  }

  // Pattern 2: Month Year to Month Year, e.g. "between August 2018 and September 2018"
  const monthYearPattern = /\b(?:between|from|during)?\s*([A-Za-z]+)\s+(\d{4})\s*(?:and|to|through|until|–|-)\s*([A-Za-z]+)\s+(\d{4})\b/i;
  const monthYearMatch = monthYearPattern.exec(text);
  if (monthYearMatch) {
    const m1 = MONTH_NAMES[monthYearMatch[1].toLowerCase()];
    const y1 = parseInt(monthYearMatch[2], 10);
    const m2 = MONTH_NAMES[monthYearMatch[3].toLowerCase()];
    const y2 = parseInt(monthYearMatch[4], 10);
    if (m1 !== undefined && m2 !== undefined && !isNaN(y1) && !isNaN(y2)) {
      const lastDay = daysInMonth(y2, m2);
      return {
        start: formatIsoDate(y1, m1, 1),
        end: formatIsoDate(y2, m2, lastDay),
        label: `${monthYearMatch[1]} ${y1} – ${monthYearMatch[3]} ${y2}`,
        confidence: 0.95,
      };
    }
  }

  // Pattern 3: Year to Year, e.g. "between 2022 and 2026", "from 2015 to 2025"
  const yearRangePattern = /\b(?:between|from|during)?\s*(\b20\d{2}|19\d{2}\b)\s*(?:and|to|through|until|–|-)\s*(\b20\d{2}|19\d{2}\b)\b/i;
  const yearMatch = yearRangePattern.exec(text);
  if (yearMatch) {
    const y1 = parseInt(yearMatch[1], 10);
    const y2 = parseInt(yearMatch[2], 10);
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    return {
      start: `${startY}-01-01`,
      end: `${endY}-12-31`,
      label: `${startY} – ${endY}`,
      confidence: 0.92,
    };
  }

  // Pattern 4: Relative "last N years" / "past N years" / "last N months"
  const relativePattern = /\b(?:last|past)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(year|years|month|months)\b/i;
  const relMatch = relativePattern.exec(text);
  if (relMatch) {
    const wordNums: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    };
    const rawCount = relMatch[1].toLowerCase();
    const count = parseInt(rawCount, 10) || wordNums[rawCount] || 1;
    const isYear = relMatch[2].toLowerCase().startsWith('year');
    const startDate = new Date();
    if (isYear) {
      startDate.setFullYear(startDate.getFullYear() - count);
    } else {
      startDate.setMonth(startDate.getMonth() - count);
    }
    const startIso = startDate.toISOString().slice(0, 10);
    const endIso = now.toISOString().slice(0, 10);
    return {
      start: startIso,
      end: endIso,
      label: `Past ${count} ${isYear ? (count === 1 ? 'year' : 'years') : (count === 1 ? 'month' : 'months')}`,
      confidence: 0.9,
    };
  }

  // Pattern 5: "since YYYY"
  const sincePattern = /\bsince\s+(\b20\d{2}|19\d{2}\b)/i;
  const sinceMatch = sincePattern.exec(text);
  if (sinceMatch) {
    const y = parseInt(sinceMatch[1], 10);
    return {
      start: `${y}-01-01`,
      end: now.toISOString().slice(0, 10),
      label: `Since ${y}`,
      confidence: 0.88,
    };
  }

  // Pattern 6: Single specific year e.g. "in 2023" or "after 2021"
  const singleYearPattern = /\b(?:in|during|after)\s+(\b20\d{2}|19\d{2}\b)\b/i;
  const singleMatch = singleYearPattern.exec(text);
  if (singleMatch) {
    const y = parseInt(singleMatch[1], 10);
    if (text.toLowerCase().includes('after')) {
      return {
        start: `${y}-01-01`,
        end: now.toISOString().slice(0, 10),
        label: `Post-${y}`,
        confidence: 0.8,
      };
    }
    return {
      start: `${y}-01-01`,
      end: `${y}-12-31`,
      label: `Year ${y}`,
      confidence: 0.85,
    };
  }

  return null;
}

/**
 * Searches REGION_PRESETS for matches in the user's text.
 */
function findPresetMatch(query: string): RegionPreset | null {
  const lower = query.toLowerCase();
  for (const preset of REGION_PRESETS) {
    // Check main id or name tokens
    const tokens = preset.name.toLowerCase().split(/[\s,·/]+/);
    for (const token of tokens) {
      if (token.length >= 4 && lower.includes(token)) {
        return preset;
      }
    }
    if (lower.includes(preset.id.toLowerCase())) {
      return preset;
    }
  }
  return null;
}

/**
 * Extracts potential region candidates from text.
 * Looks for prepositions like "in [Location]", "across [Location]", "near [Location]",
 * or checks against our built-in regional catalog.
 */
export async function extractRegion(query: string): Promise<ExtractedRegion | null> {
  const text = query.trim();

  // 1. Direct check against preset regions
  const preset = findPresetMatch(text);
  if (preset) {
    return {
      name: preset.name,
      rawText: preset.name,
      source: 'preset',
      polygon: preset.polygon,
      center: preset.center,
      confidence: 0.95,
    };
  }

  // 2. Preposition extraction: "in [Place]", "across [Place]", "around [Place]", "near [Place]"
  const prepPattern = /\b(?:in|across|near|around|over|at)\s+([A-Z][a-zA-Z0-9\s,.-]+?)(?=\s+(?:between|from|since|over|during|after|in\s+\d{4}|\?|$|\.))/;
  const match = prepPattern.exec(text);
  const candidate = match ? match[1].trim().replace(/^(the|a)\s+/i, '') : null;

  if (candidate && candidate.length >= 3 && !/^\d+$/.test(candidate) && !/^(this|that|these|the)\s+region/i.test(candidate)) {
    // Check if candidate matches a preset
    const candidatePreset = findPresetMatch(candidate);
    if (candidatePreset) {
      return {
        name: candidatePreset.name,
        rawText: candidate,
        source: 'preset',
        polygon: candidatePreset.polygon,
        center: candidatePreset.center,
        confidence: 0.92,
      };
    }

    // Try geocoding the candidate
    try {
      const results = await geocode(candidate);
      if (results.length > 0) {
        const top = results[0];
        return {
          name: top.name,
          rawText: candidate,
          source: 'draw',
          polygon: top.polygon,
          center: top.center,
          confidence: 0.88,
        };
      }
    } catch {
      // Fallback if offline
    }

    // Return inferred entity name
    return {
      name: candidate,
      rawText: candidate,
      source: 'preset',
      polygon: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      confidence: 0.65,
    };
  }

  return null;
}

/**
 * Infers appropriate earth observation modalities based on question keywords.
 */
export function inferDataSources(query: string): { sources: EvidenceSourceKind[]; intent: string | null } {
  const lower = query.toLowerCase();
  const sources = new Set<EvidenceSourceKind>(['optical']);
  let intent: string | null = null;

  // Hydrology & Flood patterns
  if (/\b(flood|flooding|inundat|water|reservoir|lake|river|wetland|cyclone|storm|deluge|precipitation|monsoon)\b/.test(lower)) {
    sources.add('sar');
    sources.add('rainfall');
    intent = 'Hydrological & Inundation Analysis';
  }

  // Vegetation & Ecology patterns
  if (/\b(vegetation|forest|deforest|drought|canopy|ndvi|biomass|crop|agriculture|farm|wildfire|burn)\b/.test(lower)) {
    sources.add('vegetation');
    sources.add('landcover');
    intent = 'Vegetation Dynamics & Land Degradation';
  }

  // Urban & Infrastructure patterns
  if (/\b(urban|city|building|infrastructure|expansion|sprawl|road|construction|drainage|development)\b/.test(lower)) {
    sources.add('infrastructure');
    sources.add('landcover');
    intent = 'Urban Growth & Built Asset Tracking';
  }

  // Topography & Terrain
  if (/\b(landslide|slope|elevation|mountain|valley|topography|erosion|morphology|dem)\b/.test(lower)) {
    sources.add('dem');
    sources.add('sar');
    intent = 'Geomorphological & Elevation Assessment';
  }

  // Default to optical + sar if standard broad question
  if (sources.size === 1) {
    sources.add('sar');
  }

  return { sources: Array.from(sources), intent };
}

/**
 * Complete NLP extraction over a user research question or prompt.
 */
export async function analyzePromptNlp(query: string): Promise<NlpExtractionResult> {
  const timeRange = extractTimeRange(query);
  const region = await extractRegion(query);
  const { sources: suggestedSources, intent: inferredIntent } = inferDataSources(query);

  const hasMatches = Boolean(timeRange || region || inferredIntent);

  const summaryParts: string[] = [];
  if (region) summaryParts.push(`Region: ${region.name}`);
  if (timeRange) summaryParts.push(`Period: ${timeRange.label}`);
  if (inferredIntent) summaryParts.push(`Focus: ${inferredIntent}`);

  return {
    hasMatches,
    timeRange,
    region,
    suggestedSources,
    inferredIntent,
    summary: summaryParts.join(' · '),
  };
}
