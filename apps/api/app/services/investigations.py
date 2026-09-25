from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.identity import Project, User
from app.models.investigation import Investigation, InvestigationStatus, Query
from app.schemas.projects import InvestigationCreateRequest, InvestigationQueryCreateRequest
from app.services.authorization import get_owned_investigation, get_owned_project


def create_investigation(
    db: Session, user: User, payload: InvestigationCreateRequest
) -> Investigation:
    get_owned_project(db, payload.project_id, user)
    investigation = Investigation(project_id=payload.project_id, title=payload.title.strip())
    db.add(investigation)
    db.commit()
    db.refresh(investigation)
    return investigation


def list_investigations(
    db: Session,
    user: User,
    page: int,
    page_size: int,
    project_id: UUID | None,
    status: InvestigationStatus | None,
    search: str | None,
) -> tuple[list[Investigation], int]:
    if project_id is not None:
        get_owned_project(db, project_id, user)

    filters = [Project.owner_id == user.id]
    if project_id is not None:
        filters.append(Investigation.project_id == project_id)
    if status is not None:
        filters.append(Investigation.status == status)
    if search:
        filters.append(Investigation.title.ilike(f"%{search.strip()}%"))

    statement = select(Investigation).join(Project).where(*filters)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
    investigations = db.scalars(
        statement.order_by(Investigation.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return investigations, total


def get_investigation(db: Session, user: User, investigation_id: UUID) -> Investigation:
    return get_owned_investigation(db, investigation_id, user)


def create_query(
    db: Session,
    user: User,
    investigation_id: UUID,
    payload: InvestigationQueryCreateRequest,
) -> Query:
    get_owned_investigation(db, investigation_id, user)
    sequence = payload.sequence
    if sequence is None:
        sequence = db.scalar(
            select(func.coalesce(func.max(Query.sequence), 0) + 1).where(
                Query.investigation_id == investigation_id
            )
        )

    query = Query(investigation_id=investigation_id, text=payload.text.strip(), sequence=sequence)
    db.add(query)
    db.commit()
    db.refresh(query)
    return query
