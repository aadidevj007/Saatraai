from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio

from app.tools.types import (
    BiTemporalEvidenceOutput,
    RasterEvidenceInput,
    ToolExecutionStatus,
)


TOOL_NAME = "bi-temporal-evidence-preflight"
TOOL_VERSION = "1.0.0"
LIMITATIONS = [
    "This preflight does not calculate or classify image change.",
    "No reprojection, resampling, radiometric normalization, or other imagery preprocessing was performed.",
    "Sensor identity and band descriptions come from user-supplied raster metadata and are not externally verified.",
    "Radiometric calibration, atmospheric correction, cloud and shadow masks, and sensor processing-level compatibility are not established.",
    "Valid-pixel masks indicate raster validity only; they are not cloud or quality masks.",
    "No model score, probability, hypothesis, or scientific conclusion is produced.",
]


def assess_pair(
    paths: tuple[Path, ...],
    input_ids: tuple[str, ...],
    input_checksums: tuple[str | None, ...] = (),
) -> BiTemporalEvidenceOutput:
    """Produce a metadata/valid-mask record and explicitly stop before change inference."""
    if len(paths) != 2 or len(input_ids) != 2:
        return _insufficient("Exactly two resolved image inputs are required.", [], False, 0, 0.0, None)

    records: list[dict] = []
    masks: list[np.ndarray] = []
    for index, (path, image_id) in enumerate(zip(paths, input_ids)):
        with rasterio.open(path) as dataset:
            tags = {key.lower(): value for key, value in dataset.tags().items()}
            valid = np.all(dataset.read_masks() > 0, axis=0)
            valid_count = int(np.count_nonzero(valid))
            pixel_total = dataset.width * dataset.height
            records.append(
                {
                    "image_id": image_id,
                    "source_checksum": input_checksums[index] if index < len(input_checksums) else None,
                    "acquisition_at": _read_time(tags),
                    "sensor_as_declared": tags.get("sensor") or tags.get("sensor_name"),
                    "crs": dataset.crs.to_string() if dataset.crs else None,
                    "bounds": {
                        "left": float(dataset.bounds.left),
                        "bottom": float(dataset.bounds.bottom),
                        "right": float(dataset.bounds.right),
                        "top": float(dataset.bounds.top),
                    },
                    "width": dataset.width,
                    "height": dataset.height,
                    "band_count": dataset.count,
                    "band_descriptions": list(dataset.descriptions),
                    "dtypes": list(dataset.dtypes),
                    "valid_pixel_count": valid_count,
                    "valid_pixel_fraction": valid_count / pixel_total if pixel_total else 0.0,
                    "grid": (dataset.crs, dataset.transform, dataset.width, dataset.height),
                }
            )
            masks.append(valid)

    inputs = [RasterEvidenceInput(**{key: value for key, value in row.items() if key != "grid"}) for row in records]
    same_grid = _same_grid(records[0]["grid"], records[1]["grid"])
    common = int(np.count_nonzero(masks[0] & masks[1])) if same_grid else 0
    total = records[0]["width"] * records[0]["height"] if same_grid else 0
    gap = _time_gap(records[0]["acquisition_at"], records[1]["acquisition_at"])

    reasons = []
    if not same_grid:
        reasons.append("Inputs are not on the same pixel grid; no resampling was performed.")
    if gap is None or gap == 0:
        reasons.append("Distinct acquisition timestamps are required.")
    if not records[0]["sensor_as_declared"] or records[0]["sensor_as_declared"] != records[1]["sensor_as_declared"]:
        reasons.append("Matching declared sensor metadata is required for a comparable pair.")
    if (
        not records[0]["band_descriptions"]
        or any(not value for value in records[0]["band_descriptions"])
        or records[0]["band_descriptions"] != records[1]["band_descriptions"]
        or records[0]["band_count"] != records[1]["band_count"]
        or records[0]["dtypes"] != records[1]["dtypes"]
    ):
        reasons.append("Matching band descriptions, counts, and data types are required.")
    if not records[0]["crs"] or records[0]["crs"] != records[1]["crs"]:
        reasons.append("Matching declared coordinate reference systems are required.")
    if same_grid and common == 0:
        reasons.append("The rasters have no mutually valid pixels.")
    # Even a metadata-compatible pair is not enough to support a scientific change result.
    reasons.append("A validated change method and calibrated/quality-screened inputs are not available.")

    return _insufficient(
        "Evidence preflight completed; a change result is unavailable.",
        inputs,
        same_grid,
        common,
        common / total if total else 0.0,
        gap,
        reasons,
    )


def _insufficient(message, inputs, same_grid, common_count, common_fraction, gap, reasons=None):
    return BiTemporalEvidenceOutput(
        status=ToolExecutionStatus.INSUFFICIENT_EVIDENCE,
        tool_name=TOOL_NAME,
        tool_version=TOOL_VERSION,
        message=message,
        inputs=inputs,
        same_grid=same_grid,
        common_valid_pixel_count=common_count,
        common_valid_pixel_fraction=common_fraction,
        temporal_gap_seconds=gap,
        limitations=[*LIMITATIONS, *(reasons or [])],
    )


def _same_grid(first, second) -> bool:
    first_crs, first_transform, first_width, first_height = first
    second_crs, second_transform, second_width, second_height = second
    return (
        first_crs is not None
        and first_crs == second_crs
        and first_width == second_width
        and first_height == second_height
        and all(abs(a - b) < 1e-9 for a, b in zip(first_transform, second_transform))
    )


def _read_time(tags: dict[str, str]) -> datetime | None:
    value = next(
        (
            tags[key]
            for key in ("acquisition_datetime", "acquisition_date", "datetime", "tifftag_datetime")
            if tags.get(key)
        ),
        None,
    )
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00").replace("/", "-")
        if len(normalized) >= 19 and normalized[4] == ":":
            normalized = f"{normalized[:4]}-{normalized[5:7]}-{normalized[8:]}"
        timestamp = datetime.fromisoformat(normalized)
        return timestamp.replace(tzinfo=UTC) if timestamp.tzinfo is None else timestamp.astimezone(UTC)
    except ValueError:
        return None


def _time_gap(first: datetime | None, second: datetime | None) -> float | None:
    if first is None or second is None:
        return None
    return abs((second - first).total_seconds())
