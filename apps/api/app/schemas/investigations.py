from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class InputModality(str, Enum):
    optical = "optical"
    sar = "sar"
    multispectral = "multispectral"


class InvestigationStatus(str, Enum):
    planned = "planned"
    running = "running"
    complete = "complete"
    blocked = "blocked"


class InvestigationRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    modality: InputModality
    input_count: int = Field(ge=1, le=2)
    dataset_hint: str | None = Field(default=None, max_length=128)


class EvidenceItem(BaseModel):
    evidence_id: UUID
    kind: Literal["validation", "retrieval", "comparison", "grounding"]
    description: str
    source: str
    confidence: float = Field(ge=0.0, le=1.0)


class InvestigationPlan(BaseModel):
    investigation_id: UUID
    status: InvestigationStatus
    query: str
    modality: InputModality
    input_count: int
    specialist: str
    permitted_parameters: list[str]
    evidence_plan: list[str]
    evidence: list[EvidenceItem]
    confidence: float = Field(ge=0.0, le=1.0)
    conclusion: str
    created_at_utc: datetime

