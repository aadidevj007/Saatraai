from __future__ import annotations

from hashlib import sha256
from typing import Iterable


def assign_splits(records: Iterable[dict], validation_fraction: float, seed: int) -> tuple[list[dict], list[dict]]:
    """Respect official splits; otherwise use a stable sample-id hash split."""
    if not 0 < validation_fraction < 1:
        raise ValueError("validation_fraction must be between zero and one")
    train, validation = [], []
    for record in records:
        split = record.get("split")
        if split == "train":
            train.append(record)
        elif split in {"validation", "val"}:
            validation.append(record)
        elif split == "test":
            continue
        else:
            sample_id = str(record.get("id", record.get("image", "")))
            bucket = int.from_bytes(sha256(f"{seed}:{sample_id}".encode()).digest()[:8], "big") / 2**64
            (validation if bucket < validation_fraction else train).append(record)
    if not train or not validation:
        raise ValueError("Both train and validation splits require at least one sample")
    return train, validation
