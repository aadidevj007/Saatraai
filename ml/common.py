from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
import rasterio


class ModelUnavailableError(RuntimeError):
    """Raised when a configured production model cannot be loaded safely."""


@dataclass(frozen=True)
class PreparedImage:
    path: Path
    width: int
    height: int


def prepare_rgb_image(source: Path, workspace: TemporaryDirectory[str]) -> PreparedImage:
    """Create a deterministic RGB PNG for VLMs from supported EO inputs."""
    output = Path(workspace.name) / "input.png"
    try:
        from PIL import Image
    except ImportError as error:
        raise ModelUnavailableError("Pillow is required for remote-sensing model preprocessing") from error
    try:
        with rasterio.open(source) as dataset:
            bands = dataset.read(list(range(1, min(dataset.count, 3) + 1)), masked=True)
            if bands.shape[0] == 1:
                bands = np.repeat(bands, 3, axis=0)
            elif bands.shape[0] == 2:
                bands = np.concatenate((bands, bands[1:2]), axis=0)
            image = np.moveaxis(_percentile_stretch(bands), 0, -1)
            Image.fromarray(image, mode="RGB").save(output, format="PNG")
            return PreparedImage(output, dataset.width, dataset.height)
    except rasterio.errors.RasterioIOError:
        with Image.open(source) as image:
            rgb = image.convert("RGB")
            rgb.save(output, format="PNG")
            return PreparedImage(output, rgb.width, rgb.height)


def _percentile_stretch(bands: np.ma.MaskedArray) -> np.ndarray:
    output = np.zeros(bands.shape, dtype=np.uint8)
    for index, band in enumerate(bands):
        values = band.compressed()
        if values.size == 0:
            continue
        low, high = np.percentile(values, (2, 98))
        if high <= low:
            high = low + 1
        output[index] = np.clip((band.filled(low) - low) * 255 / (high - low), 0, 255)
    return output
