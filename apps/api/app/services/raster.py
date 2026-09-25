from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import rasterio
from rasterio.errors import RasterioError

from app.models.eo import ImageModality

SUPPORTED_EXTENSIONS = {".tif", ".tiff", ".png", ".jpg", ".jpeg"}
BENCHMARK_IMAGE_DATASETS = {"eurosat", "mstar"}


@dataclass(frozen=True)
class RasterDetails:
    driver: str
    width: int
    height: int
    band_count: int
    crs: str | None
    transform: list[float]
    bounds: dict[str, float]
    dtypes: list[str]
    descriptions: list[str | None]
    acquisition_at: datetime | None
    detected_modality: ImageModality | None


def validate_extension(suffix: str, benchmark_dataset: str | None) -> None:
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only GeoTIFF, TIFF, PNG, and JPEG files are supported")
    if suffix in {".png", ".jpg", ".jpeg"}:
        if benchmark_dataset is None or benchmark_dataset.lower() not in BENCHMARK_IMAGE_DATASETS:
            raise ValueError("PNG/JPEG uploads require a permitted benchmark dataset")


def inspect_raster(path: Path) -> RasterDetails:
    try:
        with rasterio.open(path) as dataset:
            tags = {key.lower(): value for key, value in dataset.tags().items()}
            return RasterDetails(
                driver=dataset.driver,
                width=dataset.width,
                height=dataset.height,
                band_count=dataset.count,
                crs=dataset.crs.to_string() if dataset.crs else None,
                transform=[float(value) for value in dataset.transform],
                bounds={
                    "left": float(dataset.bounds.left),
                    "bottom": float(dataset.bounds.bottom),
                    "right": float(dataset.bounds.right),
                    "top": float(dataset.bounds.top),
                },
                dtypes=list(dataset.dtypes),
                descriptions=list(dataset.descriptions),
                acquisition_at=_extract_acquisition_at(tags),
                detected_modality=_detect_modality(dataset.count, tags, dataset.descriptions),
            )
    except RasterioError as error:
        raise ValueError("The uploaded file is not a readable raster") from error


def _detect_modality(
    band_count: int, tags: dict[str, str], descriptions: tuple[str | None, ...]
) -> ImageModality | None:
    sensor_text = " ".join([*tags.keys(), *tags.values(), *(value or "" for value in descriptions)]).lower()
    if any(token in sensor_text for token in ("sentinel-1", "sar", "radar", "sigma0", "vv", "vh", "hh", "hv")):
        return ImageModality.SAR
    if band_count >= 4:
        return ImageModality.MULTISPECTRAL
    if 1 <= band_count <= 3:
        return ImageModality.OPTICAL
    return None


def _extract_acquisition_at(tags: dict[str, str]) -> datetime | None:
    value = next(
        (
            tags[key]
            for key in ("acquisition_datetime", "acquisition_date", "datetime", "tifftag_datetime")
            if tags.get(key)
        ),
        None,
    )
    if value is None:
        return None

    normalized = value.replace("Z", "+00:00").replace("/", "-")
    if len(normalized) >= 19 and normalized[4] == ":":
        normalized = f"{normalized[:4]}-{normalized[5:7]}-{normalized[8:]}"
    try:
        timestamp = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    return timestamp.replace(tzinfo=timezone.utc) if timestamp.tzinfo is None else timestamp.astimezone(timezone.utc)
