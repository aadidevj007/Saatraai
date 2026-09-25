from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import Project, User
from app.models.investigation import Investigation


def get_owned_project(db: Session, project_id: UUID, user: User) -> Project:
    project = db.scalar(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def get_owned_investigation(db: Session, investigation_id: UUID, user: User) -> Investigation:
    investigation = db.scalar(
        select(Investigation)
        .join(Project)
        .where(Investigation.id == investigation_id, Project.owner_id == user.id)
    )
    if investigation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found"
        )
    return investigation
