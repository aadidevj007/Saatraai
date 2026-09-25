from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class DatasetConfig:
    manifest_path: str
    labels: list[str]
    validation_fraction: float = 0.1
    image_size: int = 120
    normalization_mean: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    normalization_std: list[float] = field(default_factory=lambda: [1.0, 1.0, 1.0])

    def __post_init__(self) -> None:
        if not self.labels or len(set(self.labels)) != len(self.labels):
            raise ValueError("dataset.labels must contain unique label names")
        if not 0 < self.validation_fraction < 1:
            raise ValueError("dataset.validation_fraction must be between zero and one")
        if self.image_size <= 0:
            raise ValueError("dataset.image_size must be positive")
        if len(self.normalization_mean) != len(self.normalization_std):
            raise ValueError("normalization_mean and normalization_std must have the same length")
        if any(value == 0 for value in self.normalization_std):
            raise ValueError("normalization_std cannot contain zero")


@dataclass(frozen=True)
class ModelConfig:
    architecture: str = "small_cnn"
    in_channels: int = 3
    feature_channels: int = 32
    initial_checkpoint: str | None = None
    freeze_backbone: bool = False
    version: str = "small-cnn-v1"

    def __post_init__(self) -> None:
        if self.architecture != "small_cnn":
            raise ValueError("Only the registered 'small_cnn' adaptation architecture is supported")
        if self.in_channels <= 0 or self.feature_channels <= 0:
            raise ValueError("model channel counts must be positive")


@dataclass(frozen=True)
class TrainingConfig:
    batch_size: int = 16
    learning_rate: float = 0.001
    epochs: int = 5
    seed: int = 20260906
    num_workers: int = 0
    device: str = "auto"
    resume_checkpoint: str | None = None
    output_dir: str = "artifacts/adaptation"

    def __post_init__(self) -> None:
        if self.batch_size <= 0 or self.epochs <= 0 or self.learning_rate <= 0:
            raise ValueError("batch_size, epochs, and learning_rate must be positive")
        if self.num_workers < 0:
            raise ValueError("num_workers cannot be negative")


@dataclass(frozen=True)
class AdaptationConfig:
    dataset: DatasetConfig
    model: ModelConfig
    training: TrainingConfig

    def __post_init__(self) -> None:
        if self.model.in_channels != len(self.dataset.normalization_mean):
            raise ValueError("model.in_channels must match normalization band count")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def load_config(path: str | Path) -> AdaptationConfig:
    with Path(path).open(encoding="utf-8") as source:
        raw = yaml.safe_load(source) or {}
    try:
        return AdaptationConfig(
            dataset=DatasetConfig(**raw["dataset"]),
            model=ModelConfig(**raw.get("model", {})),
            training=TrainingConfig(**raw.get("training", {})),
        )
    except (KeyError, TypeError, ValueError) as error:
        raise ValueError("Invalid adaptation configuration") from error
