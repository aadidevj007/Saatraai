"""Autonomous corpus Information Extraction (IE), geocoding, and investigation synthesis.

When OPENROUTER_API_KEY is configured, structured extraction uses OpenRouter chat
completions (JSON output). When no key is present (or if OpenRouter is transiently
unreachable), a deterministic multi-entity/date/coordinate extractor runs so corpus
ingestion remains functional while transparently labelling its provenance as
``deterministic-ie-fallback``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import re
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.models.identity import Project, User
from app.models.investigation import Investigation, InvestigationStatus, Query
from app.models.reasoning import AssessmentState, Evidence, EvidencePolarity, Hypothesis
from app.models.results import Conclusion, ConclusionState
from app.services.authorization import get_owned_investigation, get_owned_project
from app.services.openrouter import openrouter_generate_json
from ml.common import ModelUnavailableError

NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search"

MONTH_NUMBERS: dict[str, int] = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}

# Instant local catalog for common regions when offline/rate-limited (no fabricated 0,0 fallback).
KNOWN_PLACES: dict[str, tuple[str, float, float, float, float]] = {
    "kerala": ("Kerala, India", 76.27, 10.16, 0.9, 1.4),
    "kochi": ("Kochi, Kerala", 76.26, 9.93, 0.35, 0.35),
    "chennai": ("Chennai, Tamil Nadu", 80.27, 13.08, 0.4, 0.38),
    "virudhunagar": ("Virudhunagar District, Tamil Nadu", 77.55, 9.17, 0.45, 0.45),
    "sundarbans": ("Sundarbans Delta, West Bengal", 88.90, 21.94, 0.65, 0.5),
    "brahmaputra": ("Brahmaputra Valley, Assam", 91.74, 26.14, 1.1, 0.45),
    "assam": ("Assam, India", 92.93, 26.20, 1.2, 0.7),
    "mumbai": ("Mumbai, Maharashtra", 72.88, 19.08, 0.35, 0.42),
    "vijayawada": ("Vijayawada, Andhra Pradesh", 80.65, 16.51, 0.45, 0.4),
    "mekong": ("Mekong Delta, Vietnam", 105.79, 10.03, 0.85, 0.6),
    "nile": ("Nile Delta, Egypt", 31.24, 30.45, 0.85, 0.5),
    "california": ("California, United States", -120.5, 37.2, 2.5, 3.0),
}

CORPUS_IE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "research_question": {"type": "string"},
        "intent": {"type": "string"},
        "suggested_sources": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": ["optical", "sar", "rainfall", "dem", "landcover", "vegetation", "infrastructure"],
            },
        },
        "locations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "role": {"type": "string"},
                    "lat": {"type": ["number", "null"]},
                    "lng": {"type": ["number", "null"]},
                    "summary": {"type": "string"},
                },
                "required": ["name", "role", "summary"],
            },
        },
        "timestamps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "iso_date": {"type": "string"},
                    "iso_end": {"type": ["string", "null"]},
                    "event_summary": {"type": "string"},
                    "location_name": {"type": ["string", "null"]},
                },
                "required": ["label", "iso_date", "event_summary"],
            },
        },
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "category": {"type": "string"},
                    "detail": {"type": "string"},
                },
                "required": ["name", "category", "detail"],
            },
        },
        "hypotheses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "statement": {"type": "string"},
                    "assessment_state": {
                        "type": "string",
                        "enum": ["proposed", "under_review", "supported", "rejected", "inconclusive"],
                    },
                    "confidence": {"type": "number"},
                },
                "required": ["statement", "assessment_state", "confidence"],
            },
        },
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "polarity": {"type": "string", "enum": ["supporting", "contradicting", "neutral"]},
                    "hypothesis_index": {"type": "integer"},
                    "location_name": {"type": ["string", "null"]},
                    "timestamp": {"type": ["string", "null"]},
                    "source_quote": {"type": "string"},
                },
                "required": ["summary", "polarity", "hypothesis_index", "source_quote"],
            },
        },
        "conclusion_summary": {"type": "string"},
    },
    "required": [
        "title",
        "research_question",
        "intent",
        "suggested_sources",
        "locations",
        "timestamps",
        "entities",
        "hypotheses",
        "claims",
        "conclusion_summary",
    ],
}


def _box_polygon(lng: float, lat: float, half_w: float = 0.25, half_h: float = 0.25) -> list[list[float]]:
    return [
        [round(lng - half_w, 5), round(lat - half_h, 5)],
        [round(lng + half_w, 5), round(lat - half_h, 5)],
        [round(lng + half_w, 5), round(lat + half_h, 5)],
        [round(lng - half_w, 5), round(lat + half_h, 5)],
    ]


def _extract_coordinates_from_text(text: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    # Match e.g. "26.2006° N, 92.9376° E" or "13.08, 80.27" or "38.2919 N, 122.4580 W"
    deg_pattern = re.compile(
        r"(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]+\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\b",
        re.IGNORECASE,
    )
    for match in deg_pattern.finditer(text):
        lat = float(match.group(1))
        ns = (match.group(2) or "").upper()
        lng = float(match.group(3))
        ew = (match.group(4) or "").upper()
        # Require at least one directional letter or decimal places so standalone years/integers don't match
        if not ns and not ew and ("." not in match.group(1) or "." not in match.group(3)):
            continue
        if ns == "S":
            lat = -abs(lat)
        if ew == "W":
            lng = -abs(lng)
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            results.append(
                {
                    "name": f"{abs(lat):.4f}°{'N' if lat >= 0 else 'S'}, {abs(lng):.4f}°{'E' if lng >= 0 else 'W'}",
                    "role": "coordinate_mention",
                    "lat": lat,
                    "lng": lng,
                    "summary": "Explicit geographic coordinates extracted from corpus text.",
                }
            )
    return results


def _geocode_place(name: str, geocode_cache: dict[str, dict[str, Any] | None]) -> dict[str, Any] | None:
    key = name.strip().lower()
    if not key:
        return None
    if key in geocode_cache:
        return geocode_cache[key]

    for known_key, (label, lng, lat, hw, hh) in KNOWN_PLACES.items():
        if known_key in key or key in known_key:
            resolved = {
                "resolved_name": label,
                "lat": lat,
                "lng": lng,
                "polygon": _box_polygon(lng, lat, hw, hh),
                "source": "catalog",
            }
            geocode_cache[key] = resolved
            return resolved

    try:
        response = httpx.get(
            NOMINATIM_ENDPOINT,
            params={"q": name.strip(), "format": "jsonv2", "limit": "1"},
            headers={"Accept": "application/json", "User-Agent": "SAATRAAI/1.0"},
            timeout=3.0,
        )
        if response.status_code == 200:
            rows = response.json()
            if isinstance(rows, list) and rows:
                top = rows[0]
                lat = float(top["lat"])
                lng = float(top["lon"])
                bb = top.get("boundingbox")
                if isinstance(bb, list) and len(bb) == 4:
                    south, north, west, east = (float(bb[0]), float(bb[1]), float(bb[2]), float(bb[3]))
                    polygon = [[west, south], [east, south], [east, north], [west, north]]
                else:
                    polygon = _box_polygon(lng, lat)
                resolved = {
                    "resolved_name": str(top.get("display_name", name)).split(",")[0].strip() or name,
                    "lat": lat,
                    "lng": lng,
                    "polygon": polygon,
                    "source": "nominatim",
                }
                geocode_cache[key] = resolved
                return resolved
    except (httpx.HTTPError, OSError, ValueError, KeyError, TypeError):
        pass

    geocode_cache[key] = None
    return None


def _normalize_iso_date(raw: str) -> str | None:
    cleaned = raw.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", cleaned):
        return cleaned
    if re.fullmatch(r"\d{4}-\d{2}", cleaned):
        return f"{cleaned}-01"
    if re.fullmatch(r"\d{4}", cleaned):
        return f"{cleaned}-01-01"
    return None


def _deterministic_ie(corpus: str) -> dict[str, Any]:
    """Rule-based extraction fallback covering multiple timestamps, coordinates, and places."""
    text = " ".join(corpus.split())
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", corpus.strip()) if len(s.strip()) > 12]
    question = next((s for s in sentences if s.endswith("?")), None)
    first_sentence = sentences[0] if sentences else text[:120]
    if not question:
        question = f"What events, drivers, and spatiotemporal evidence are reported for: {first_sentence[:180]}"

    # Dates & temporal expressions
    timestamps: list[dict[str, Any]] = []
    seen_dates: set[str] = set()

    for match in re.finditer(r"\b(\d{4}-\d{2}-\d{2})\b", text):
        iso = match.group(1)
        if iso not in seen_dates:
            seen_dates.add(iso)
            timestamps.append({"label": iso, "iso_date": iso, "iso_end": None, "event_summary": first_sentence[:140]})

    for match in re.finditer(r"\b([A-Za-z]+)\s+(\d{1,2}),?\s+(19\d{2}|20\d{2})\b", text):
        month = MONTH_NUMBERS.get(match.group(1).lower())
        if month:
            day = min(max(int(match.group(2)), 1), 28)
            year = int(match.group(3))
            iso = f"{year:04d}-{month:02d}-{day:02d}"
            if iso not in seen_dates:
                seen_dates.add(iso)
                timestamps.append({"label": match.group(0), "iso_date": iso, "iso_end": None, "event_summary": match.group(0)})

    for match in re.finditer(r"\b([A-Za-z]+)\s+(19\d{2}|20\d{2})\b", text):
        month = MONTH_NUMBERS.get(match.group(1).lower())
        if month:
            year = int(match.group(2))
            iso = f"{year:04d}-{month:02d}-01"
            if iso not in seen_dates:
                seen_dates.add(iso)
                timestamps.append({"label": match.group(0), "iso_date": iso, "iso_end": None, "event_summary": f"Observed period ({match.group(0)})"})

    for match in re.finditer(r"\b(19\d{2}|20\d{2})\b", text):
        year = int(match.group(1))
        iso = f"{year:04d}-01-01"
        if not any(d.startswith(f"{year:04d}-") for d in seen_dates):
            seen_dates.add(iso)
            timestamps.append({"label": str(year), "iso_date": iso, "iso_end": f"{year:04d}-12-31", "event_summary": f"Mentioned year {year}"})

    timestamps.sort(key=lambda item: item["iso_date"])

    # Coordinates & place mentions
    locations: list[dict[str, Any]] = _extract_coordinates_from_text(corpus)
    seen_names: set[str] = {loc["name"].lower() for loc in locations}

    lower = text.lower()
    for known_key, (label, lat_or_lng, lat_val, _, _) in KNOWN_PLACES.items():
        if re.search(rf"\b{re.escape(known_key)}\b", lower) and label.lower() not in seen_names:
            seen_names.add(label.lower())
            locations.append({
                "name": label,
                "role": "detected_region",
                "lat": lat_val,
                "lng": lat_or_lng,
                "summary": f"Detected region mention matching '{known_key}'.",
            })

    prep_places = re.finditer(
        r"\b(?:in|across|near|around|over|along|at)\s+([A-Z][A-Za-z0-9\-']+(?:\s+[A-Z][A-Za-z0-9\-']+){0,2})",
        text,
    )
    for match in prep_places:
        candidate = match.group(1).strip(" ,.;:!?")
        if len(candidate) >= 3 and candidate.lower() not in seen_names and candidate.lower() not in MONTH_NUMBERS:
            seen_names.add(candidate.lower())
            locations.append({
                "name": candidate,
                "role": "mentioned_place",
                "lat": None,
                "lng": None,
                "summary": f"Place phrase extracted from corpus ('{match.group(0)}').",
            })

    # Intent & sources
    sources = {"optical"}
    intent = "Earth Observation Corpus Analysis"
    if re.search(r"\b(flood|inundat|river|embankment|cyclone|rain|monsoon|deluge|water)\b", lower):
        sources.update({"sar", "rainfall"})
        intent = "Hydrological & Flood Analysis"
    elif re.search(r"\b(fire|wildfire|burn|smoke|thermal|drought|forest|vegetation|deforest)\b", lower):
        sources.update({"vegetation", "landcover"})
        intent = "Wildfire & Vegetation Dynamics"
    elif re.search(r"\b(urban|city|construction|road|bridge|port|building|infrastructure)\b", lower):
        sources.update({"infrastructure", "landcover"})
        intent = "Urban & Infrastructure Monitoring"
    else:
        sources.add("sar")

    hypotheses = [
        {
            "statement": (
                sentences[0]
                if sentences
                else "Observed anomaly described in the input corpus warrants multi-date satellite verification."
            ),
            "assessment_state": "under_review",
            "confidence": 0.45,
        }
    ]
    if len(sentences) > 1:
        hypotheses.append(
            {
                "statement": sentences[1],
                "assessment_state": "proposed",
                "confidence": 0.35,
            }
        )

    claims = [
        {
            "summary": sent[:280],
            "polarity": "neutral",
            "hypothesis_index": 0 if idx == 0 else min(idx, len(hypotheses) - 1),
            "location_name": locations[0]["name"] if locations else None,
            "timestamp": timestamps[min(idx, len(timestamps) - 1)]["iso_date"] if timestamps else None,
            "source_quote": sent[:240],
        }
        for idx, sent in enumerate(sentences[:5])
    ]

    return {
        "title": (first_sentence[:68] + "...") if len(first_sentence) > 70 else first_sentence,
        "research_question": question,
        "intent": intent,
        "suggested_sources": sorted(sources),
        "locations": locations,
        "timestamps": timestamps,
        "entities": [],
        "hypotheses": hypotheses,
        "claims": claims,
        "conclusion_summary": (
            f"Deterministic Information Extraction parsed {len(locations)} location candidate(s) and "
            f"{len(timestamps)} timestamp(s) from the input corpus. Satellite imagery validation has not yet run."
        ),
    }


def extract_corpus_intelligence(corpus: str, settings: Settings | None = None) -> tuple[dict[str, Any], str]:
    """Extract locations, timestamps, entities, claims, and hypotheses from a raw corpus."""
    active_settings = settings or get_settings()
    cleaned = corpus.strip()
    if len(cleaned) < 5:
        raise ValueError("Input corpus must contain at least 5 non-whitespace characters")

    extractor_label = "deterministic-ie-fallback"
    raw_extracted: dict[str, Any] | None = None

    if active_settings.openrouter_api_key:
        system_prompt = (
            "You are an expert Geospatial & Earth-Observation Information Extraction engine. "
            "Given a raw user corpus (article, report, field note, or research prompt), extract ALL "
            "factual details explicitly present in the text without inventing measurements, dates, or places. "
            "Identify every geographic place/region/coordinate, every date/timestamp/event period, key physical "
            "or hazard entities, candidate scientific hypotheses grounded in the corpus, atomic corpus claims, "
            "and a cautious conclusion explicitly distinguishing text-reported claims from satellite verification."
        )
        user_prompt = (
            f"Current UTC date: {datetime.now(UTC).strftime('%Y-%m-%d')}.\n"
            "Extract structured spatiotemporal intelligence from this corpus:\n\n"
            f"{cleaned[:20000]}"
        )
        try:
            raw_extracted = openrouter_generate_json(
                active_settings.openrouter_api_key,
                active_settings.openrouter_model,
                system_prompt,
                user_prompt,
                CORPUS_IE_SCHEMA,
                timeout=active_settings.openrouter_timeout_seconds,
            )
            extractor_label = active_settings.openrouter_model
        except (ModelUnavailableError, ValueError):
            raw_extracted = None

    if raw_extracted is None:
        raw_extracted = _deterministic_ie(cleaned)

    # Merge explicit coordinates from text + geocode every extracted location honestly
    geocode_cache: dict[str, dict[str, Any] | None] = {}
    resolved_locations: list[dict[str, Any]] = []
    seen_loc_keys: set[str] = set()

    candidate_locations = list(raw_extracted.get("locations") or []) + _extract_coordinates_from_text(cleaned)
    for item in candidate_locations:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        key = name.lower()
        if key in seen_loc_keys:
            continue
        seen_loc_keys.add(key)

        lat_val = item.get("lat")
        lng_val = item.get("lng")
        lat = float(lat_val) if isinstance(lat_val, (int, float)) and -90 <= float(lat_val) <= 90 else None
        lng = float(lng_val) if isinstance(lng_val, (int, float)) and -180 <= float(lng_val) <= 180 else None

        polygon: list[list[float]] | None = None
        geo_source = "extracted_coordinates" if (lat is not None and lng is not None) else "unresolved"
        if lat is not None and lng is not None:
            polygon = _box_polygon(lng, lat)
        else:
            geo = _geocode_place(name, geocode_cache)
            if geo:
                lat = geo["lat"]
                lng = geo["lng"]
                polygon = geo["polygon"]
                geo_source = geo["source"]

        resolved_locations.append(
            {
                "name": name,
                "role": str(item.get("role", "mentioned_location")),
                "summary": str(item.get("summary", "")),
                "lat": lat,
                "lng": lng,
                "polygon": polygon,
                "geocoded": lat is not None and lng is not None,
                "geo_source": geo_source,
            }
        )

    # Normalize timestamps & sort chronologically
    resolved_timestamps: list[dict[str, Any]] = []
    for item in raw_extracted.get("timestamps") or []:
        if not isinstance(item, dict):
            continue
        iso_start = _normalize_iso_date(str(item.get("iso_date", "")))
        if not iso_start:
            continue
        iso_end = _normalize_iso_date(str(item.get("iso_end") or "")) if item.get("iso_end") else None
        resolved_timestamps.append(
            {
                "label": str(item.get("label", iso_start)),
                "iso_date": iso_start,
                "iso_end": iso_end,
                "event_summary": str(item.get("event_summary", "")),
                "location_name": str(item.get("location_name")) if item.get("location_name") else None,
            }
        )
    resolved_timestamps.sort(key=lambda item: item["iso_date"])

    # Compute overall bounding polygon & temporal window cleanly (no fake [0,0] fallback!)
    geocoded_locs = [loc for loc in resolved_locations if loc["geocoded"]]
    primary_region_name: str | None = None
    region_polygon: list[list[float]] | None = None
    region_source: str | None = None
    if geocoded_locs:
        primary = geocoded_locs[0]
        primary_region_name = (
            primary["name"]
            if len(geocoded_locs) == 1
            else f"{primary['name']} (+{len(geocoded_locs) - 1} locations)"
        )
        all_pts = [pt for loc in geocoded_locs for pt in (loc["polygon"] or [])]
        lngs = [p[0] for p in all_pts]
        lats = [p[1] for p in all_pts]
        region_polygon = [
            [min(lngs), min(lats)],
            [max(lngs), min(lats)],
            [max(lngs), max(lats)],
            [min(lngs), max(lats)],
        ]
        region_source = "ie_auto"

    now_iso = datetime.now(UTC).strftime("%Y-%m-%d")
    if resolved_timestamps:
        time_start = resolved_timestamps[0]["iso_date"]
        ends = [t["iso_end"] or t["iso_date"] for t in resolved_timestamps]
        time_end = max(ends)
        if time_end <= time_start:
            time_end = now_iso if now_iso > time_start else time_start
    else:
        time_end = now_iso
        time_start = f"{datetime.now(UTC).year - 3}-{datetime.now(UTC).strftime('%m-%d')}"

    return (
        {
            "title": str(raw_extracted.get("title") or cleaned[:68]).strip()[:250],
            "research_question": str(raw_extracted.get("research_question") or cleaned[:500]).strip(),
            "intent": str(raw_extracted.get("intent") or "Earth Observation Corpus Analysis").strip(),
            "suggested_sources": [str(s) for s in (raw_extracted.get("suggested_sources") or ["optical", "sar"])],
            "region_name": primary_region_name,
            "region_source": region_source,
            "region_polygon": region_polygon,
            "time_start": time_start,
            "time_end": time_end,
            "locations": resolved_locations,
            "timestamps": resolved_timestamps,
            "entities": list(raw_extracted.get("entities") or []),
            "hypotheses": list(raw_extracted.get("hypotheses") or []),
            "claims": list(raw_extracted.get("claims") or []),
            "conclusion_summary": str(raw_extracted.get("conclusion_summary") or "").strip(),
        },
        extractor_label,
    )


def _get_or_create_default_project(db: Session, user: User, project_id: UUID | None) -> Project:
    if project_id is not None:
        return get_owned_project(db, project_id, user)
    existing = db.scalar(
        select(Project).where(Project.owner_id == user.id).order_by(Project.created_at.desc())
    )
    if existing is not None:
        return existing
    project = Project(owner_id=user.id, name="Autonomous Research Workspace", description="Auto-created workspace")
    db.add(project)
    db.flush()
    return project


def create_or_extract_autonomous_investigation(
    db: Session,
    user: User,
    corpus: str,
    *,
    project_id: UUID | None = None,
    investigation_id: UUID | None = None,
    settings: Settings | None = None,
) -> tuple[Investigation, dict[str, Any]]:
    """Run corpus IE, geocode places, resolve timestamps, and persist full investigation records."""
    extracted, extractor_label = extract_corpus_intelligence(corpus, settings=settings)

    config_dict: dict[str, Any] = {
        "region_name": extracted["region_name"],
        "region_source": extracted["region_source"],
        "region_polygon": extracted["region_polygon"],
        "time_start": extracted["time_start"],
        "time_end": extracted["time_end"],
        "evidence_sources": extracted["suggested_sources"],
        "question": extracted["research_question"],
        "extracted_locations": extracted["locations"],
        "extracted_timestamps": extracted["timestamps"],
        "extracted_entities": extracted["entities"],
        "extractor_model": extractor_label,
        "corpus_excerpt": corpus.strip()[:1500],
    }

    if investigation_id is not None:
        investigation = get_owned_investigation(db, investigation_id, user)
        investigation.configuration = config_dict
        if not investigation.title:
            investigation.title = extracted["title"]
    else:
        project = _get_or_create_default_project(db, user, project_id)
        investigation = Investigation(
            project_id=project.id,
            title=extracted["title"],
            status=InvestigationStatus.COMPLETE,
            configuration=config_dict,
        )
        db.add(investigation)
        db.flush()

    query = Query(investigation_id=investigation.id, text=extracted["research_question"], sequence=1)
    db.add(query)
    db.flush()

    # Map location name -> coordinates for evidence markers
    loc_by_name = {
        loc["name"].lower(): loc for loc in extracted["locations"] if loc.get("geocoded")
    }
    first_geocoded = next((loc for loc in extracted["locations"] if loc.get("geocoded")), None)

    created_hypotheses: list[Hypothesis] = []
    for item in extracted["hypotheses"]:
        stmt = str(item.get("statement", "")).strip()
        if not stmt:
            continue
        try:
            state = AssessmentState(str(item.get("assessment_state", "proposed")).lower())
        except ValueError:
            state = AssessmentState.PROPOSED
        conf_raw = item.get("confidence")
        conf = max(0.0, min(1.0, float(conf_raw))) if isinstance(conf_raw, (int, float)) else 0.4
        hyp = Hypothesis(
            investigation_id=investigation.id,
            statement=stmt,
            assessment_state=state,
            confidence=conf,
        )
        db.add(hyp)
        created_hypotheses.append(hyp)
    db.flush()

    created_evidence_count = 0
    for claim in extracted["claims"]:
        summary = str(claim.get("summary", "")).strip()
        if not summary:
            continue
        try:
            polarity = EvidencePolarity(str(claim.get("polarity", "neutral")).lower())
        except ValueError:
            polarity = EvidencePolarity.NEUTRAL
        hyp_idx = claim.get("hypothesis_index")
        linked_hyp = (
            created_hypotheses[hyp_idx]
            if isinstance(hyp_idx, int) and 0 <= hyp_idx < len(created_hypotheses)
            else (created_hypotheses[0] if created_hypotheses else None)
        )
        loc_name = str(claim.get("location_name") or "").strip()
        loc_match = loc_by_name.get(loc_name.lower()) if loc_name else None
        if loc_match is None and loc_name:
            loc_match = next(
                (v for k, v in loc_by_name.items() if loc_name.lower() in k or k in loc_name.lower()),
                None,
            )
        coords = (
            [loc_match["lng"], loc_match["lat"]]
            if loc_match
            else ([first_geocoded["lng"], first_geocoded["lat"]] if first_geocoded else None)
        )
        ev = Evidence(
            investigation_id=investigation.id,
            hypothesis_id=linked_hyp.id if linked_hyp else None,
            query_id=query.id,
            polarity=polarity,
            summary=summary,
            provenance={
                "source_kind": "corpus_text_extraction",
                "extractor": extractor_label,
                "tool_name": "corpus-ie",
                "tool_version": extractor_label,
                "location_name": loc_name or (loc_match["name"] if loc_match else None),
                "coordinates": coords,
                "timestamp": claim.get("timestamp"),
                "source_quote": str(claim.get("source_quote", ""))[:300],
            },
        )
        db.add(ev)
        created_evidence_count += 1

    # Persisted conclusion grounded strictly in corpus extraction (+ explicit imagery disclaimer)
    conclusion_text = extracted["conclusion_summary"] or (
        f"Extracted {len(extracted['locations'])} location(s), {len(extracted['timestamps'])} timestamp(s), "
        f"and {created_evidence_count} corpus claim(s)."
    )
    conclusion = Conclusion(
        investigation_id=investigation.id,
        hypothesis_id=created_hypotheses[0].id if created_hypotheses else None,
        state=ConclusionState.DRAFT,
        summary=conclusion_text,
        confidence=created_hypotheses[0].confidence if created_hypotheses else None,
        rationale={
            "extractor": extractor_label,
            "location_count": len(extracted["locations"]),
            "geocoded_count": sum(1 for loc in extracted["locations"] if loc["geocoded"]),
            "timestamp_count": len(extracted["timestamps"]),
            "evidence_count": created_evidence_count,
            "satellite_verified": False,
            "note": "Derived from user-provided corpus text via Information Extraction; attach GeoTIFF scenes to corroborate via remote-sensing models.",
        },
    )
    db.add(conclusion)
    db.commit()
    db.refresh(investigation)

    return investigation, {
        "extractor": extractor_label,
        "locations": extracted["locations"],
        "timestamps": extracted["timestamps"],
        "entities": extracted["entities"],
        "hypotheses_created": len(created_hypotheses),
        "evidence_created": created_evidence_count,
        "conclusion_created": True,
    }
