from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.db.session import get_db
from app.models.eo import ImageModality, ImageRelationshipType, UploadedImage
from app.models.identity import User
from app.schemas.images import ImageIngestionResponse, IngestedImageResponse
from app.services.ingestion import ingest_images
from app.services.storage import ObjectStorage, get_object_storage

router = APIRouter()


def serialize_image(image: UploadedImage) -> IngestedImageResponse:
    metadata = image.metadata_record
    if metadata is None:
        raise RuntimeError("ingested image is missing metadata")
    return IngestedImageResponse(
        id=image.id,
        original_filename=image.original_filename,
        modality=metadata.modality.value,
        acquisition_at=metadata.acquisition_at,
        width=metadata.width,
        height=metadata.height,
        band_count=int(metadata.band_information["count"]),
        crs=metadata.crs,
        bounds=metadata.bounding_box,
        file_format=metadata.file_format,
        mime_type=metadata.mime_type,
        checksum=metadata.checksum,
        storage_location=metadata.storage_location,
    )


@router.post(
    "/investigations/{investigation_id}/images",
    response_model=ImageIngestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest one or two remote-sensing images",
    description=(
        "Uploads and validates a single raster, a co-registered optical/SAR pair, "
        "or a compatible bi-temporal pair. Files are stored outside PostgreSQL."
    ),
    responses={
        **ERROR_RESPONSES,
        413: {"description": "File exceeds the configured upload limit."},
    },
)
async def upload_images(
    investigation_id: UUID,
    files: Annotated[list[UploadFile], File(description="One or two raster files")],
    declared_modalities: Annotated[
        list[ImageModality] | None,
        Form(description="Optional modality values aligned with files"),
    ] = None,
    benchmark_dataset: Annotated[
        str | None,
        Form(max_length=128, description="Required for permitted PNG/JPEG benchmark inputs"),
    ] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: ObjectStorage = Depends(get_object_storage),
) -> ImageIngestionResponse:
    images, relationship_type = await ingest_images(
        db,
        current_user,
        investigation_id,
        files,
        declared_modalities,
        benchmark_dataset,
        storage,
    )
    configuration = (
        "single_image"
        if relationship_type is None
        else "cross_modal_pair"
        if relationship_type == ImageRelationshipType.CROSS_MODAL
        else "bi_temporal_pair"
    )
    return ImageIngestionResponse(
        investigation_id=investigation_id,
        input_configuration=configuration,
        images=[serialize_image(image) for image in images],
    )
