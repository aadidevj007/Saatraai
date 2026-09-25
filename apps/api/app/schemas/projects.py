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


class InvestigationCreateRequest(BaseModel):
    project_id: UUID
    title: str = Field(min_length=1, max_length=255)


class InvestigationResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    status: str
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
