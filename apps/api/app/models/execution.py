from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime
from sqlalchemy import ForeignKey, Index, JSON, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import UUIDTimestampMixin, string_enum

if TYPE_CHECKING:
    from app.models.investigation import Investigation
    from app.models.reasoning import Evidence


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Task(UUIDTimestampMixin, Base):
    __tablename__ = "tasks"

    investigation_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    task_type: Mapped[str] = mapped_column(String(255), nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[ExecutionStatus] = mapped_column(string_enum(ExecutionStatus, "execution_status"), default=ExecutionStatus.PENDING, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON)

    investigation: Mapped[Investigation] = relationship(back_populates="tasks")
    model_runs: Mapped[list[ModelRun]] = relationship(back_populates="task", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tasks_investigation_status", "investigation_id", "status"),
        Index("ix_tasks_created_at", "created_at"),
        UniqueConstraint("investigation_id", "idempotency_key", name="uq_tasks_investigation_idempotency_key"),
    )


class ModelRun(UUIDTimestampMixin, Base):
    __tablename__ = "model_runs"

    task_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(255))
    tool_name: Mapped[str | None] = mapped_column(String(255))
    parameters: Mapped[dict | None] = mapped_column(JSON)
    input_ids: Mapped[list[str] | None] = mapped_column(JSON)
    output_metadata: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[ExecutionStatus] = mapped_column(string_enum(ExecutionStatus, "execution_status"), default=ExecutionStatus.PENDING, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_information: Mapped[str | None] = mapped_column(Text)

    task: Mapped[Task] = relationship(back_populates="model_runs")
    evidence_items: Mapped[list[Evidence]] = relationship(back_populates="model_run")

    __table_args__ = (
        Index("ix_model_runs_task_status", "task_id", "status"),
        Index("ix_model_runs_started_at", "started_at"),
    )
