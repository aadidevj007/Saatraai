from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Float, ForeignKey, Index, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import UUIDTimestampMixin, string_enum

if TYPE_CHECKING:
    from app.models.eo import UploadedImage
    from app.models.execution import ModelRun
    from app.models.investigation import Investigation, Query
    from app.models.results import Conclusion


class AssessmentState(str, Enum):
    PROPOSED = "proposed"
    UNDER_REVIEW = "under_review"
    SUPPORTED = "supported"
    REJECTED = "rejected"
    INCONCLUSIVE = "inconclusive"


class EvidencePolarity(str, Enum):
    SUPPORTING = "supporting"
    CONTRADICTING = "contradicting"
    NEUTRAL = "neutral"
    INSUFFICIENT = "insufficient"


class Hypothesis(UUIDTimestampMixin, Base):
    __tablename__ = "hypotheses"

    investigation_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    assessment_state: Mapped[AssessmentState] = mapped_column(string_enum(AssessmentState, "assessment_state"), default=AssessmentState.PROPOSED, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)

    investigation: Mapped[Investigation] = relationship(back_populates="hypotheses")
    evidence_items: Mapped[list[Evidence]] = relationship(back_populates="hypothesis")
    conclusions: Mapped[list[Conclusion]] = relationship(back_populates="hypothesis")

    __table_args__ = (
        Index("ix_hypotheses_investigation_state", "investigation_id", "assessment_state"),
        Index("ix_hypotheses_created_at", "created_at"),
    )


class Evidence(UUIDTimestampMixin, Base):
    __tablename__ = "evidence"

    investigation_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    hypothesis_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("hypotheses.id", ondelete="SET NULL"), index=True)
    image_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("uploaded_images.id", ondelete="SET NULL"), index=True)
    query_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("queries.id", ondelete="SET NULL"), index=True)
    model_run_id: Mapped[UUID | None] = mapped_column(Uuid, ForeignKey("model_runs.id", ondelete="SET NULL"), index=True)
    polarity: Mapped[EvidencePolarity] = mapped_column(string_enum(EvidencePolarity, "evidence_polarity"), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    provenance: Mapped[dict] = mapped_column(JSON, nullable=False)
    source_uri: Mapped[str | None] = mapped_column(String(2048))
    source_reference: Mapped[str | None] = mapped_column(String(1024))

    investigation: Mapped[Investigation] = relationship(back_populates="evidence_items")
    hypothesis: Mapped[Hypothesis | None] = relationship(back_populates="evidence_items")
    image: Mapped[UploadedImage | None] = relationship()
    query: Mapped[Query | None] = relationship()
    model_run: Mapped[ModelRun | None] = relationship(back_populates="evidence_items")

    __table_args__ = (
        Index("ix_evidence_investigation_polarity", "investigation_id", "polarity"),
        Index("ix_evidence_created_at", "created_at"),
    )
