from __future__ import annotations

from enum import Enum
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.eo import ImageModality


class ToolTaskType(str, Enum):
    VQA = "vqa"
    CAPTIONING = "captioning"
    GROUNDING = "grounding"
    CHANGE_DETECTION = "change_detection"
    CHANGE_VQA = "change_vqa"
    OPTICAL_SAR = "optical_sar"


class InputConfiguration(str, Enum):
    SINGLE_IMAGE = "single_image"
    CROSS_MODAL_PAIR = "cross_modal_pair"
    BI_TEMPORAL_PAIR = "bi_temporal_pair"


class ToolExecutionStatus(str, Enum):
    SUCCEEDED = "SUCCEEDED"
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class ToolInvocation(BaseModel):
    input_configuration: InputConfiguration
    modalities: list[ImageModality] = Field(min_length=1, max_length=2)
    parameters: dict[str, Any] = Field(default_factory=dict)


class NotImplementedToolOutput(BaseModel):
    status: ToolExecutionStatus = ToolExecutionStatus.NOT_IMPLEMENTED
    tool_name: str
    tool_version: str
    message: str


class RasterEvidenceInput(BaseModel):
    image_id: str
    source_kind: str = "user_uploaded_raster"
    source_checksum: str | None = None
    acquisition_at: datetime | None
    sensor_as_declared: str | None
    crs: str | None
    bounds: dict[str, float]
    width: int
    height: int
    band_count: int
    band_descriptions: list[str | None]
    dtypes: list[str]
    valid_pixel_count: int
    valid_pixel_fraction: float


class BiTemporalEvidenceOutput(BaseModel):
    status: ToolExecutionStatus
    analysis_status: Literal["INSUFFICIENT_EVIDENCE"] = "INSUFFICIENT_EVIDENCE"
    tool_name: str
    tool_version: str
    message: str
    inputs: list[RasterEvidenceInput]
    same_grid: bool
    common_valid_pixel_count: int
    common_valid_pixel_fraction: float
    temporal_gap_seconds: float | None
    limitations: list[str]


@dataclass(frozen=True)
class ToolExecutionContext:
    """Resolved private input files supplied by storage, never by a client payload."""

    input_paths: tuple[Path, ...]
    input_ids: tuple[str, ...] = ()
    input_checksums: tuple[str | None, ...] = ()


class VqaToolOutput(BaseModel):
    status: ToolExecutionStatus = ToolExecutionStatus.SUCCEEDED
    answer: str = Field(min_length=1)
    confidence: float | None = None


class GroundingBox(BaseModel):
    x_min: float = Field(ge=0)
    y_min: float = Field(ge=0)
    x_max: float = Field(ge=0)
    y_max: float = Field(ge=0)
    angle_degrees: float | None = None


class GroundingToolOutput(BaseModel):
    status: ToolExecutionStatus = ToolExecutionStatus.SUCCEEDED
    boxes: list[GroundingBox] = Field(min_length=1)
    masks: list[dict[str, Any]] = Field(default_factory=list)
    confidence: float | None = None


class ToolParameters(BaseModel):
    model_config = ConfigDict(extra="forbid")


class VqaParameters(ToolParameters):
    question: str = Field(min_length=1, max_length=2000)


class CaptioningParameters(ToolParameters):
    detail_level: str = Field(default="concise", pattern="^(concise|detailed)$")


class GroundingParameters(ToolParameters):
    target: str = Field(min_length=1, max_length=500)


class ChangeDetectionParameters(ToolParameters):
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class EvidencePreflightParameters(ToolParameters):
    """No tunable analysis parameters: this tool only inspects input evidence."""


class ChangeVqaParameters(ToolParameters):
    question: str = Field(min_length=1, max_length=2000)


class OpticalSarParameters(ToolParameters):
    fusion_mode: str = Field(default="feature", pattern="^(feature|late)$")
