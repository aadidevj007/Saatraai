from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class ProjectPageResponse(BaseModel):
    items: list[ProjectResponse]
    page: int
    page_size: int
    total: int


class InvestigationConfiguration(BaseModel):
    """Structured wizard configuration persisted verbatim with the investigation.

    This records what the analyst ASKED for (region, time range, sources) — it is
    never a measurement, model output, or result.
    """

    region_name: str | None = Field(default=None, max_length=255)
    region_source: str | None = Field(default=None, max_length=32)
    region_polygon: list[list[float]] | None = None
    time_start: str | None = Field(default=None, max_length=32)
    time_end: str | None = Field(default=None, max_length=32)
    evidence_sources: list[str] | None = None
    question: str | None = Field(default=None, max_length=2000)


class InvestigationCreateRequest(BaseModel):
    project_id: UUID
    title: str = Field(min_length=1, max_length=255)
    configuration: InvestigationConfiguration | None = None


class InvestigationConfigurationUpdate(BaseModel):
    configuration: InvestigationConfiguration


class InvestigationResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    status: str
    configuration: InvestigationConfiguration | None = None
    created_at: datetime
    updated_at: datetime


class InvestigationPageResponse(BaseModel):
    items: list[InvestigationResponse]
    page: int
    page_size: int
    total: int


class InvestigationQueryCreateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    sequence: int | None = Field(default=None, ge=1)


class InvestigationQueryResponse(BaseModel):
    id: UUID
    investigation_id: UUID
    text: str
    sequence: int
    created_at: datetime
    updated_at: datetime


class InvestigationQueryListResponse(BaseModel):
    items: list[InvestigationQueryResponse]
