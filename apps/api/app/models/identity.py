from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import UUIDTimestampMixin

if TYPE_CHECKING:
    from app.models.eo import UploadedImage
    from app.models.investigation import Investigation


class User(UUIDTimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    projects: Mapped[list[Project]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_users_created_at", "created_at"),)


class Project(UUIDTimestampMixin, Base):
    __tablename__ = "projects"

    owner_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))

    owner: Mapped[User] = relationship(back_populates="projects")
    investigations: Mapped[list[Investigation]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    uploaded_images: Mapped[list[UploadedImage]] = relationship(back_populates="project")

    __table_args__ = (Index("ix_projects_owner_created_at", "owner_id", "created_at"),)
