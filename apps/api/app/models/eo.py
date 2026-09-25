from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime
from sqlalchemy import ForeignKey, Index, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from geoalchemy2.elements import WKBElement

from app.db.base import Base
from app.models.common import UUIDTimestampMixin, string_enum

if TYPE_CHECKING:
    from app.models.identity import Project
    from app.models.investigation import Investigation


class ImageModality(str, Enum):
    OPTICAL = "optical"
    MULTISPECTRAL = "multispectral"
    SAR = "sar"


class ImageRelationshipType(str, Enum):
    BI_TEMPORAL = "bi_temporal"
    CROSS_MODAL = "cross_modal"


class UploadedImage(UUIDTimestampMixin, Base):
    __tablename__ = "uploaded_images"

    project_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(1024), nullable=False)

    project: Mapped[Project] = relationship(back_populates="uploaded_images")
    investigation: Mapped[Investigation] = relationship(back_populates="uploaded_images")
    metadata_record: Mapped[ImageMetadata | None] = relationship(back_populates="image", cascade="all, delete-orphan", uselist=False)
    source_relationships: Mapped[list[ImageRelationship]] = relationship(back_populates="source_image", foreign_keys="ImageRelationship.source_image_id", cascade="all, delete-orphan")
    related_relationships: Mapped[list[ImageRelationship]] = relationship(back_populates="related_image", foreign_keys="ImageRelationship.related_image_id", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_uploaded_images_project_created_at", "project_id", "created_at"),
        Index("ix_uploaded_images_investigation_created_at", "investigation_id", "created_at"),
    )


class ImageMetadata(UUIDTimestampMixin, Base):
    __tablename__ = "image_metadata"

    image_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("uploaded_images.id", ondelete="CASCADE"), unique=True, nullable=False)
    modality: Mapped[ImageModality] = mapped_column(string_enum(ImageModality, "image_modality"), nullable=False)
    acquisition_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    crs: Mapped[str | None] = mapped_column(String(255))
    bounding_box: Mapped[dict | None] = mapped_column(JSON)
    # Source coordinates retain their CRS above; these values are normalized to EPSG:4326.
    footprint_geometry: Mapped[WKBElement | None] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True)
    )
    bounding_geometry: Mapped[WKBElement | None] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True)
    )
    centroid_geometry: Mapped[WKBElement | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True)
    )
    width: Mapped[int | None]
    height: Mapped[int | None]
    band_information: Mapped[dict | list | None] = mapped_column(JSON)
    file_format: Mapped[str | None] = mapped_column(String(100))
    mime_type: Mapped[str | None] = mapped_column(String(255))
    checksum: Mapped[str | None] = mapped_column(String(255), index=True)
    storage_location: Mapped[str] = mapped_column(String(2048), nullable=False)

    image: Mapped[UploadedImage] = relationship(back_populates="metadata_record")

    __table_args__ = (Index("ix_image_metadata_modality_acquisition", "modality", "acquisition_at"),)


class ImageRelationship(UUIDTimestampMixin, Base):
    __tablename__ = "image_relationships"

    source_image_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("uploaded_images.id", ondelete="CASCADE"), nullable=False, index=True)
    related_image_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("uploaded_images.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type: Mapped[ImageRelationshipType] = mapped_column(string_enum(ImageRelationshipType, "image_relationship_type"), nullable=False)

    source_image: Mapped[UploadedImage] = relationship(back_populates="source_relationships", foreign_keys=[source_image_id])
    related_image: Mapped[UploadedImage] = relationship(back_populates="related_relationships", foreign_keys=[related_image_id])

    __table_args__ = (
        CheckConstraint("source_image_id <> related_image_id", name="ck_image_relationship_distinct_images"),
        Index("ix_image_relationships_type_created_at", "relationship_type", "created_at"),
    )
