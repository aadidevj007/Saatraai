from __future__ import annotations

import json
from pathlib import Path

import numpy as np


def create_smoke_dataset(root: str | Path, seed: int = 20260906) -> Path:
    """Generate deterministic local samples for CI; this is not BigEarthNet data."""
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    labels = ["Urban fabric", "Arable land", "Forests", "Pastures"]
    random = np.random.default_rng(seed)
    records = []
    for index in range(12):
        image = random.normal(0, 1, size=(3, 16, 16)).astype(np.float32)
        image[index % 3] += 1.0
        path = root / f"sample-{index}.npy"
        np.save(path, image)
        records.append({
            "id": f"smoke-{index}",
            "image": str(path.resolve()),
            "labels": [labels[index % len(labels)]],
            "split": "validation" if index in {2, 7, 11} else "train",
        })
    manifest = root / "manifest.jsonl"
    manifest.write_text("".join(json.dumps(record) + "\n" for record in records), encoding="utf-8")
    return manifest
