from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.db.session import get_db
from app.models.identity import Project, User
from app.schemas.projects import (
    ProjectCreateRequest,
    ProjectPageResponse,
    ProjectResponse,
)
from app.services import projects as project_service

router = APIRouter()


def serialize_project(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project",
    description="Creates a project owned by the authenticated user.",
    responses=ERROR_RESPONSES,
)
def create_project(
    payload: ProjectCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    return serialize_project(project_service.create_project(db, current_user, payload))


@router.get(
    "/projects",
    response_model=ProjectPageResponse,
    summary="List owned projects",
    description="Lists only projects owned by the authenticated user.",
    responses=ERROR_RESPONSES,
)
def list_projects(
    page: Annotated[int, Query(ge=1, description="One-based page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    search: Annotated[str | None, Query(max_length=255, description="Project name search")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectPageResponse:
    projects, total = project_service.list_projects(db, current_user, page, page_size, search)
    return ProjectPageResponse(
        items=[serialize_project(project) for project in projects],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="Get an owned project",
    responses=ERROR_RESPONSES,
)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    return serialize_project(project_service.get_project(db, current_user, project_id))
