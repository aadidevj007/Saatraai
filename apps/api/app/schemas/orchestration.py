from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class OrchestrationRequest(BaseModel):
    query: str = Field(min_length=1, max_length=10000)
    image_ids: list[UUID] = Field(min_length=1, max_length=2)
    parameters: dict = Field(default_factory=dict)


class ExecutionTraceResponse(BaseModel):
    task_id: UUID
    query_id: UUID
    selected_task: str
    selected_tool: str
    model_version: str | None
    parameters: dict
    input_ids: list[str]
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    output_references: list[str]
    error: str | None
    evidence_id: UUID | None
    idempotent_replay: bool = False
