from sqlalchemy import func, select
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.identity import Project, User
from app.schemas.projects import ProjectCreateRequest
from app.services.authorization import get_owned_project


def create_project(db: Session, user: User, payload: ProjectCreateRequest) -> Project:
    project = Project(
        owner_id=user.id,
        name=payload.name.strip(),
        description=payload.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def list_projects(
    db: Session, user: User, page: int, page_size: int, search: str | None
) -> tuple[list[Project], int]:
    filters = [Project.owner_id == user.id]
    if search:
        filters.append(Project.name.ilike(f"%{search.strip()}%"))

    total = db.scalar(select(func.count()).select_from(Project).where(*filters)) or 0
    projects = db.scalars(
        select(Project)
        .where(*filters)
        .order_by(Project.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return projects, total


def get_project(db: Session, user: User, project_id: UUID) -> Project:
    return get_owned_project(db, project_id, user)
