from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.db.session import get_db
from app.models.identity import User
from app.models.investigation import Investigation, InvestigationStatus, Query as InvestigationQuery
from app.schemas.projects import (
    InvestigationCreateRequest,
    InvestigationPageResponse,
    InvestigationQueryCreateRequest,
    InvestigationQueryResponse,
    InvestigationResponse,
)
from app.services import investigations as investigation_service

router = APIRouter()


def serialize_investigation(investigation: Investigation) -> InvestigationResponse:
    return InvestigationResponse(
        id=investigation.id,
        project_id=investigation.project_id,
        title=investigation.title,
        status=investigation.status.value,
        created_at=investigation.created_at,
        updated_at=investigation.updated_at,
    )


def serialize_query(query: InvestigationQuery) -> InvestigationQueryResponse:
    return InvestigationQueryResponse(
        id=query.id,
        investigation_id=query.investigation_id,
        text=query.text,
        sequence=query.sequence,
        created_at=query.created_at,
        updated_at=query.updated_at,
    )


@router.post(
    "/investigations",
    response_model=InvestigationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an investigation",
    description="Creates an investigation in a project owned by the authenticated user.",
    responses=ERROR_RESPONSES,
)
def create_investigation(
    payload: InvestigationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvestigationResponse:
    return serialize_investigation(
        investigation_service.create_investigation(db, current_user, payload)
    )


@router.get(
    "/investigations",
    response_model=InvestigationPageResponse,
    summary="List owned investigations",
    description="Lists investigations through projects owned by the authenticated user.",
    responses=ERROR_RESPONSES,
)
def list_investigations(
    page: Annotated[int, Query(ge=1, description="One-based page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    project_id: Annotated[UUID | None, Query(description="Owned project filter")] = None,
    investigation_status: Annotated[
        InvestigationStatus | None, Query(alias="status", description="Investigation status filter")
    ] = None,
    search: Annotated[str | None, Query(max_length=255, description="Investigation title search")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvestigationPageResponse:
    investigations, total = investigation_service.list_investigations(
        db,
        current_user,
        page,
        page_size,
        project_id,
        investigation_status,
        search,
    )
    return InvestigationPageResponse(
        items=[serialize_investigation(investigation) for investigation in investigations],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/investigations/{investigation_id}",
    response_model=InvestigationResponse,
    summary="Get an owned investigation",
    responses=ERROR_RESPONSES,
)
def get_investigation(
    investigation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvestigationResponse:
    return serialize_investigation(
        investigation_service.get_investigation(db, current_user, investigation_id)
    )


@router.post(
    "/investigations/{investigation_id}/queries",
    response_model=InvestigationQueryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an investigation query",
    description="Adds a persisted user query to an investigation owned by the authenticated user.",
    responses=ERROR_RESPONSES,
)
def create_query(
    investigation_id: UUID,
    payload: InvestigationQueryCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvestigationQueryResponse:
    return serialize_query(
        investigation_service.create_query(db, current_user, investigation_id, payload)
    )
