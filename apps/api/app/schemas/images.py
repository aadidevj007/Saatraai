from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class IngestedImageResponse(BaseModel):
    id: UUID
    original_filename: str
    modality: str
    acquisition_at: datetime | None
    width: int | None
    height: int | None
    band_count: int
    crs: str | None
    bounds: dict[str, float] | None
    file_format: str | None
    mime_type: str | None
    checksum: str | None
    storage_location: str


class ImageIngestionResponse(BaseModel):
    investigation_id: UUID
    input_configuration: str
    images: list[IngestedImageResponse]
