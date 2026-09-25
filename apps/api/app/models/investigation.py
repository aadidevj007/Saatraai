from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import UUIDTimestampMixin, string_enum

if TYPE_CHECKING:
    from app.models.eo import UploadedImage
    from app.models.execution import Task
    from app.models.identity import Project
    from app.models.reasoning import Evidence, Hypothesis
    from app.models.results import Conclusion, Report


class InvestigationStatus(str, Enum):
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETE = "complete"
    BLOCKED = "blocked"


class Investigation(UUIDTimestampMixin, Base):
    __tablename__ = "investigations"

    project_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[InvestigationStatus] = mapped_column(
        string_enum(InvestigationStatus, "investigation_status"),
        default=InvestigationStatus.PLANNED,
        nullable=False,
    )

    project: Mapped[Project] = relationship(back_populates="investigations")
    queries: Mapped[list[Query]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    uploaded_images: Mapped[list[UploadedImage]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    tasks: Mapped[list[Task]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    hypotheses: Mapped[list[Hypothesis]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    evidence_items: Mapped[list[Evidence]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    conclusions: Mapped[list[Conclusion]] = relationship(back_populates="investigation", cascade="all, delete-orphan")
    reports: Mapped[list[Report]] = relationship(back_populates="investigation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_investigations_project_created_at", "project_id", "created_at"),
        Index("ix_investigations_status_updated_at", "status", "updated_at"),
    )


class Query(UUIDTimestampMixin, Base):
    __tablename__ = "queries"

    investigation_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sequence: Mapped[int] = mapped_column(default=0, nullable=False)

    investigation: Mapped[Investigation] = relationship(back_populates="queries")

    __table_args__ = (Index("ix_queries_investigation_created_at", "investigation_id", "created_at"),)
