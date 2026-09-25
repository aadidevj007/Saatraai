from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.eo import ImageMetadata, ImageModality, ImageRelationship, ImageRelationshipType, UploadedImage
from app.models.identity import User
from app.services.authorization import get_owned_investigation
from app.services.raster import RasterDetails, inspect_raster, validate_extension
from app.services.storage import ObjectStorage, StagedObject


@dataclass(frozen=True)
class ValidatedRaster:
    staged: StagedObject
    details: RasterDetails
    modality: ImageModality


def validation_error(errors: list[dict[str, str]]) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail={"message": "Input compatibility validation failed", "errors": errors},
    )


async def ingest_images(
    db: Session,
    user: User,
    investigation_id: UUID,
    files: Sequence[UploadFile],
    declared_modalities: Sequence[ImageModality] | None,
    benchmark_dataset: str | None,
    storage: ObjectStorage,
) -> tuple[list[UploadedImage], ImageRelationshipType | None]:
    investigation = get_owned_investigation(db, investigation_id, user)
    if len(files) not in {1, 2}:
        raise validation_error([{"field": "files", "message": "Upload exactly one or two images"}])
    if declared_modalities is not None and len(declared_modalities) != len(files):
        raise validation_error(
            [{"field": "declared_modalities", "message": "Provide one modality per file"}]
        )

    staged_objects: list[StagedObject] = []
    try:
        validated = []
        for index, upload in enumerate(files):
            suffix = Path(upload.filename or "").suffix.lower()
            try:
                validate_extension(suffix, benchmark_dataset)
            except ValueError as error:
                raise validation_error([{"field": f"files[{index}]", "message": str(error)}]) from error

            staged = await storage.stage(upload)
            staged_objects.append(staged)
            try:
                details = inspect_raster(staged.path)
            except ValueError as error:
                raise validation_error([{"field": f"files[{index}]", "message": str(error)}]) from error

            declared = declared_modalities[index] if declared_modalities is not None else None
            if details.detected_modality and declared and details.detected_modality != declared:
                raise validation_error(
                    [{"field": f"declared_modalities[{index}]", "message": "Declared modality conflicts with raster metadata"}]
                )
            modality = details.detected_modality or declared
            if modality is None:
                raise validation_error(
                    [{"field": f"files[{index}]", "message": "Modality cannot be determined; declare it explicitly"}]
                )
            validated.append(ValidatedRaster(staged=staged, details=details, modality=modality))

        relationship_type = validate_compatibility(validated)
        images, stored_objects = _persist_images(db, investigation.project_id, investigation_id, validated, relationship_type, storage)
        return images, relationship_type
    finally:
        for staged in staged_objects:
            storage.discard(staged)


def validate_compatibility(inputs: Sequence[ValidatedRaster]) -> ImageRelationshipType | None:
    if len(inputs) == 1:
        return None

    first, second = inputs
    modalities = {first.modality, second.modality}
    if ImageModality.SAR in modalities and len(modalities) == 2:
        errors = _co_registration_errors(first, second)
        if errors:
            raise validation_error(errors)
        return ImageRelationshipType.CROSS_MODAL

    if first.modality != second.modality:
        raise validation_error(
            [{"field": "files", "message": "Pair must be optical/SAR cross-modal or share one modality for bi-temporal analysis"}]
        )
    errors = _bi_temporal_errors(first, second)
    if errors:
        raise validation_error(errors)
    return ImageRelationshipType.BI_TEMPORAL


def _co_registration_errors(first: ValidatedRaster, second: ValidatedRaster) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if first.details.crs is None or second.details.crs is None:
        errors.append({"field": "files", "message": "Cross-modal inputs require CRS metadata"})
    elif first.details.crs != second.details.crs:
        errors.append({"field": "files", "message": "Cross-modal inputs must use the same CRS"})
    if first.details.width != second.details.width or first.details.height != second.details.height:
        errors.append({"field": "files", "message": "Cross-modal inputs must have matching dimensions"})
    if not _same_transform(first.details.transform, second.details.transform):
        errors.append({"field": "files", "message": "Cross-modal inputs must have matching transforms"})
    if not _same_bounds(first.details.bounds, second.details.bounds):
        errors.append({"field": "files", "message": "Cross-modal inputs must cover the same bounds"})
    return errors


def _bi_temporal_errors(first: ValidatedRaster, second: ValidatedRaster) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    if first.details.acquisition_at is None or second.details.acquisition_at is None:
        errors.append({"field": "files", "message": "Bi-temporal inputs require acquisition timestamps"})
    elif first.details.acquisition_at == second.details.acquisition_at:
        errors.append({"field": "files", "message": "Bi-temporal inputs must have distinct acquisition timestamps"})
    if first.details.crs is None or second.details.crs is None:
        errors.append({"field": "files", "message": "Bi-temporal inputs require CRS metadata"})
    elif first.details.crs != second.details.crs:
        errors.append({"field": "files", "message": "Bi-temporal inputs must use the same CRS"})
    elif not _bounds_intersect(first.details.bounds, second.details.bounds):
        errors.append({"field": "files", "message": "Bi-temporal inputs must have intersecting bounds"})
    return errors


def _same_transform(first: list[float], second: list[float]) -> bool:
    return len(first) == len(second) and all(abs(left - right) < 1e-9 for left, right in zip(first, second))


def _same_bounds(first: dict[str, float], second: dict[str, float]) -> bool:
    return all(abs(first[key] - second[key]) < 1e-9 for key in first)


def _bounds_intersect(first: dict[str, float], second: dict[str, float]) -> bool:
    return not (
        first["right"] <= second["left"]
        or second["right"] <= first["left"]
        or first["top"] <= second["bottom"]
        or second["top"] <= first["bottom"]
    )


def _persist_images(
    db: Session,
    project_id: UUID,
    investigation_id: UUID,
    validated: Sequence[ValidatedRaster],
    relationship_type: ImageRelationshipType | None,
    storage: ObjectStorage,
) -> tuple[list[UploadedImage], list]:
    stored_objects = []
    images: list[UploadedImage] = []
    try:
        for item in validated:
            stored = storage.promote(item.staged)
            stored_objects.append(stored)
            image = UploadedImage(
                project_id=project_id,
                investigation_id=investigation_id,
                original_filename=item.staged.filename,
            )
            ImageMetadata(
                image=image,
                modality=item.modality,
                acquisition_at=item.details.acquisition_at,
                crs=item.details.crs,
                bounding_box=item.details.bounds,
                width=item.details.width,
                height=item.details.height,
                band_information={
                    "count": item.details.band_count,
                    "dtypes": item.details.dtypes,
                    "descriptions": item.details.descriptions,
                    "transform": item.details.transform,
                },
                file_format=item.details.driver,
                mime_type=_mime_type(item.staged.suffix),
                checksum=item.staged.checksum,
                storage_location=stored.uri,
            )
            images.append(image)
            db.add(image)

        if relationship_type is not None:
            db.add(
                ImageRelationship(
                    source_image=images[0],
                    related_image=images[1],
                    relationship_type=relationship_type,
                )
            )
        db.commit()
        for image in images:
            db.refresh(image)
        return images, stored_objects
    except Exception:
        db.rollback()
        for stored in stored_objects:
            storage.delete(stored)
        raise


def _mime_type(suffix: str) -> str:
    return {
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }[suffix]
