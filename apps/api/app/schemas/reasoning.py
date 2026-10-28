from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class EvidenceResponse(BaseModel):
    id: UUID
    investigation_id: UUID
    hypothesis_id: UUID | None
    image_id: UUID | None
    query_id: UUID | None
    model_run_id: UUID | None
    polarity: str
    summary: str
    provenance: dict
    source_uri: str | None
    source_reference: str | None
    created_at: datetime


class HypothesisResponse(BaseModel):
    id: UUID
    investigation_id: UUID
    statement: str
    assessment_state: str
    confidence: float | None
    created_at: datetime
    evidence: list[EvidenceResponse] = []


class ConclusionResponse(BaseModel):
    id: UUID
    investigation_id: UUID
    hypothesis_id: UUID | None
    state: str
    summary: str
    confidence: float | None
    rationale: dict | None
    created_at: datetime


class EvidenceListResponse(BaseModel):
    items: list[EvidenceResponse]


class HypothesisListResponse(BaseModel):
    items: list[HypothesisResponse]


class ConclusionListResponse(BaseModel):
    items: list[ConclusionResponse]


class ServiceStatusResponse(BaseModel):
    id: str
    label: str
    state: str
    detail: str | None = None


class SystemStatusResponse(BaseModel):
    services: list[ServiceStatusResponse]
    checked_at: datetime
