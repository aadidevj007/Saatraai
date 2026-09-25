from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from torch import Tensor


def load_manifest(path: str | Path) -> list[dict]:
    manifest_path = Path(path)
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Dataset manifest does not exist: {manifest_path}")
    with manifest_path.open(encoding="utf-8") as source:
        records = [_resolve_record_paths(json.loads(line), manifest_path.parent) for line in source if line.strip()]
    if not records:
        raise ValueError("Dataset manifest contains no records")
    return records


def _resolve_record_paths(record: dict, root: Path) -> dict:
    """Resolve manifest-relative files once, keeping the dataset worker stateless."""
    resolved = dict(record)
    if "image" in resolved:
        resolved["image"] = str((root / resolved["image"]).resolve()) if not Path(resolved["image"]).is_absolute() else resolved["image"]
    if "band_paths" in resolved:
        resolved["band_paths"] = [
            str((root / value).resolve()) if not Path(value).is_absolute() else value
            for value in resolved["band_paths"]
        ]
    return resolved


class BigEarthNetManifestDataset:
    """Loads local BigEarthNet-style samples from .npy imagery or per-band GeoTIFF paths."""

    def __init__(self, records: list[dict], labels: list[str], image_size: int, mean: list[float], std: list[float]) -> None:
        self.records = records
        self.labels = labels
        self.image_size = image_size
        self.mean = np.asarray(mean, dtype=np.float32)[:, None, None]
        self.std = np.asarray(std, dtype=np.float32)[:, None, None]
        if np.any(self.std == 0):
            raise ValueError("normalization_std cannot contain zero")

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[Tensor, Tensor]:
        import torch
        import torch.nn.functional as functional

        record = self.records[index]
        if not isinstance(record.get("labels"), list):
            raise ValueError(f"Sample '{record.get('id', index)}' requires a labels list")
        image = _load_image(record)
        if image.shape[0] != len(self.mean):
            raise ValueError(f"Sample '{record.get('id', index)}' has {image.shape[0]} channels; expected {len(self.mean)}")
        image = (image.astype(np.float32) - self.mean) / self.std
        tensor = torch.from_numpy(image)
        tensor = functional.interpolate(tensor.unsqueeze(0), size=(self.image_size, self.image_size), mode="bilinear", align_corners=False).squeeze(0)
        target = torch.tensor([float(label in record["labels"]) for label in self.labels], dtype=torch.float32)
        return tensor, target


def _load_image(record: dict) -> np.ndarray:
    if "image" in record:
        image = np.load(record["image"])
        if image.ndim != 3:
            raise ValueError("Numpy image must have three dimensions")
        return image if image.shape[0] <= image.shape[-1] else np.moveaxis(image, -1, 0)
    if "band_paths" in record:
        import rasterio

        bands = []
        for path in record["band_paths"]:
            with rasterio.open(path) as dataset:
                bands.append(dataset.read(1))
        return np.stack(bands)
    raise ValueError("Manifest record requires 'image' or 'band_paths'")
