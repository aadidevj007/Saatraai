from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.dependencies import get_current_user
from app.core.config import get_settings
from app.models.identity import User
from app.schemas.geochat import GeoChatGroundingResponse, GeoChatVqaResponse

router = APIRouter(prefix="/models/geochat")


async def _stage_upload(upload: UploadFile) -> Path:
    settings = get_settings()
    content = await upload.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds upload limit")
    suffix = Path(upload.filename or "image").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".webp"}:
        suffix = ".img"
    temporary = NamedTemporaryFile(prefix="saatraai-geochat-", suffix=suffix, delete=False)
    temporary.write(content)
    temporary.close()
    return Path(temporary.name)


def _require_model() -> None:
    settings = get_settings()
    if not settings.geochat_model_path and not settings.geochat_remote_url:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Neither GEOCHAT_MODEL_PATH nor GEOCHAT_REMOTE_URL is configured; GeoChat inference is unavailable",
        )


@router.post("/vqa", response_model=GeoChatVqaResponse, summary="Ask GeoChat a question about an image")
async def geochat_vqa(
    image: Annotated[UploadFile, File(description="One optical or multispectral image")],
    question: Annotated[str, Form(min_length=1, max_length=2000)],
    current_user: User = Depends(get_current_user),
) -> GeoChatVqaResponse:
    del current_user
    _require_model()
    from app.services.geochat_remote import run_geochat_vqa
    from ml.common import ModelUnavailableError
    from ml.vqa import normalize_answer

    image_path = await _stage_upload(image)
    try:
        answer = run_geochat_vqa(get_settings(), image_path, question.strip())
    except ModelUnavailableError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    finally:
        image_path.unlink(missing_ok=True)
    return GeoChatVqaResponse(model="MBZUAI/geochat-7B", version="geochat-7B", answer=normalize_answer(answer))


@router.post("/grounding", response_model=GeoChatGroundingResponse, summary="Ground a target with GeoChat")
async def geochat_grounding(
    image: Annotated[UploadFile, File(description="One optical or multispectral image")],
    target: Annotated[str, Form(min_length=1, max_length=500)],
    current_user: User = Depends(get_current_user),
) -> GeoChatGroundingResponse:
    del current_user
    _require_model()
    from app.services.geochat_remote import run_geochat_grounding
    from ml.common import ModelUnavailableError

    image_path = await _stage_upload(image)
    try:
        boxes = run_geochat_grounding(get_settings(), image_path, target.strip())
    except ModelUnavailableError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    finally:
        image_path.unlink(missing_ok=True)
    return GeoChatGroundingResponse(model="MBZUAI/geochat-7B", version="geochat-7B", boxes=boxes)