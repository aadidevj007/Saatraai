from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Float, ForeignKey, Index, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import UUIDTimestampMixin, string_enum

if TYPE_CHECKING:
    from app.models.investigation import Investigation
    from app.models.reasoning import Hypothesis


class ConclusionState(str, Enum):
    DRAFT = "draft"
    FINAL = "final"
    INCONCLUSIVE = "inconclusive"


class Conclusion(UUIDTimestampMixin, Base):
    __tablename__ = "conclusions"

    investigation_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    hypothesis_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("hypotheses.id", ondelete="SET NULL"), index=True)
    state: Mapped[ConclusionState] = mapped_column(string_enum(ConclusionState, "conclusion_state"), default=ConclusionState.DRAFT, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    rationale: Mapped[dict | None] = mapped_column(JSON)

    investigation: Mapped[Investigation] = relationship(back_populates="conclusions")
    hypothesis: Mapped[Hypothesis | None] = relationship(back_populates="conclusions")
    reports: Mapped[list[Report]] = relationship(back_populates="conclusion")

    __table_args__ = (
        Index("ix_conclusions_investigation_state", "investigation_id", "state"),
        Index("ix_conclusions_created_at", "created_at"),
    )


class Report(UUIDTimestampMixin, Base):
    __tablename__ = "reports"

    investigation_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    conclusion_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("conclusions.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    storage_location: Mapped[str | None] = mapped_column(String(2048))
    checksum: Mapped[str | None] = mapped_column(String(255), index=True)

    investigation: Mapped[Investigation] = relationship(back_populates="reports")
    conclusion: Mapped[Conclusion | None] = relationship(back_populates="reports")

    __table_args__ = (Index("ix_reports_investigation_created_at", "investigation_id", "created_at"),)
