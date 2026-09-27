from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.db.session import get_db
from app.models.identity import User
from app.models.reasoning import Evidence, Hypothesis
from app.models.results import Conclusion
from app.schemas.reasoning import (
    ConclusionListResponse,
    ConclusionResponse,
    EvidenceListResponse,
    EvidenceResponse,
    HypothesisListResponse,
    HypothesisResponse,
)
from app.services.authorization import get_owned_investigation

router = APIRouter()


def serialize_evidence(evidence: Evidence) -> EvidenceResponse:
    return EvidenceResponse(
        id=evidence.id,
        investigation_id=evidence.investigation_id,
        hypothesis_id=evidence.hypothesis_id,
        image_id=evidence.image_id,
        query_id=evidence.query_id,
        model_run_id=evidence.model_run_id,
        polarity=evidence.polarity.value,
        summary=evidence.summary,
        provenance=evidence.provenance or {},
        source_uri=evidence.source_uri,
        source_reference=evidence.source_reference,
        created_at=evidence.created_at,
    )


@router.get(
    "/investigations/{investigation_id}/evidence",
    response_model=EvidenceListResponse,
    summary="List evidence for an owned investigation",
    description="Returns persisted evidence records with provenance. Newest first.",
    responses=ERROR_RESPONSES,
)
def list_evidence(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EvidenceListResponse:
    get_owned_investigation(db, investigation_id, current_user)
    rows = db.scalars(
        select(Evidence)
        .where(Evidence.investigation_id == investigation_id)
        .order_by(Evidence.created_at.desc())
    ).all()
    return EvidenceListResponse(items=[serialize_evidence(row) for row in rows])


@router.get(
    "/investigations/{investigation_id}/hypotheses",
    response_model=HypothesisListResponse,
    summary="List hypotheses for an owned investigation",
    responses=ERROR_RESPONSES,
)
def list_hypotheses(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HypothesisListResponse:
    get_owned_investigation(db, investigation_id, current_user)
    hypotheses = db.scalars(
        select(Hypothesis)
        .where(Hypothesis.investigation_id == investigation_id)
        .order_by(Hypothesis.created_at.asc())
    ).all()
    evidence_rows = db.scalars(
        select(Evidence)
        .where(
            Evidence.investigation_id == investigation_id,
            Evidence.hypothesis_id.is_not(None),
        )
        .order_by(Evidence.created_at.asc())
    ).all()
    by_hypothesis: dict[UUID, list[EvidenceResponse]] = {}
    for row in evidence_rows:
        if row.hypothesis_id is not None:
            by_hypothesis.setdefault(row.hypothesis_id, []).append(serialize_evidence(row))

    return HypothesisListResponse(
        items=[
            HypothesisResponse(
                id=hypothesis.id,
                investigation_id=hypothesis.investigation_id,
                statement=hypothesis.statement,
                assessment_state=hypothesis.assessment_state.value,
                confidence=hypothesis.confidence,
                created_at=hypothesis.created_at,
                evidence=by_hypothesis.get(hypothesis.id, []),
            )
            for hypothesis in hypotheses
        ]
    )


@router.get(
    "/investigations/{investigation_id}/conclusions",
    response_model=ConclusionListResponse,
    summary="List conclusions for an owned investigation",
    responses=ERROR_RESPONSES,
)
def list_conclusions(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConclusionListResponse:
    get_owned_investigation(db, investigation_id, current_user)
    rows = db.scalars(
        select(Conclusion)
        .where(Conclusion.investigation_id == investigation_id)
        .order_by(Conclusion.created_at.desc())
    ).all()
    return ConclusionListResponse(
        items=[
            ConclusionResponse(
                id=row.id,
                investigation_id=row.investigation_id,
                hypothesis_id=row.hypothesis_id,
                state=row.state.value,
                summary=row.summary,
                confidence=row.confidence,
                rationale=row.rationale,
                created_at=row.created_at,
            )
            for row in rows
        ]
    )
