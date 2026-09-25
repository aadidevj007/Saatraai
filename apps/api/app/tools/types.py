from __future__ import annotations

from enum import Enum
from dataclasses import dataclass
from pathlib import Path
from typing import Any

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


class ToolInvocation(BaseModel):
    input_configuration: InputConfiguration
    modalities: list[ImageModality] = Field(min_length=1, max_length=2)
    parameters: dict[str, Any] = Field(default_factory=dict)


class NotImplementedToolOutput(BaseModel):
    status: ToolExecutionStatus = ToolExecutionStatus.NOT_IMPLEMENTED
    tool_name: str
    tool_version: str
    message: str


@dataclass(frozen=True)
class ToolExecutionContext:
    """Resolved private input files supplied by storage, never by a client payload."""

    input_paths: tuple[Path, ...]


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


class ChangeVqaParameters(ToolParameters):
    question: str = Field(min_length=1, max_length=2000)


class OpticalSarParameters(ToolParameters):
    fusion_mode: str = Field(default="feature", pattern="^(feature|late)$")
