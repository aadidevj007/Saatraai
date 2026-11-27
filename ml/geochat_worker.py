"""Standalone GPU worker server exposing GeoChat-7B over HTTP for hosted APIs.

Run this on a GPU machine that has ``MBZUAI/geochat-7B`` weights and the
upstream ``geochat`` + ``torch`` runtime installed, then configure the Render API
service with ``GEOCHAT_REMOTE_URL`` (and ``GEOCHAT_REMOTE_TOKEN``).
"""

from __future__ import annotations

import hmac
import importlib.util
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status

from ml.common import ModelUnavailableError
from ml.grounding import GeoChatGroundingRunner
from ml.vqa import GeoChatVqaRunner, normalize_answer


def _configured_token() -> str | None:
    raw = os.environ.get("GEOCHAT_REMOTE_TOKEN", "").strip()
    return raw or None


def _require_token(authorization: str | None = Header(default=None)) -> None:
    expected = _configured_token()
    if not expected:
        return
    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    provided = authorization[len(prefix) :].strip()
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token")


def _model_settings() -> tuple[str | None, str | None, str, int]:
    model_path = os.environ.get("GEOCHAT_MODEL_PATH", "").strip() or None
    model_base = os.environ.get("GEOCHAT_MODEL_BASE", "").strip() or None
    device = os.environ.get("GEOCHAT_DEVICE", "cuda").strip() or "cuda"
    max_new_tokens = int(os.environ.get("GEOCHAT_MAX_NEW_TOKENS", "300"))
    return model_path, model_base, device, max_new_tokens


def _runtime_ready() -> tuple[bool, str]:
    model_path, _, _, _ = _model_settings()
    if not model_path or not Path(model_path).exists():
        return False, "GEOCHAT_MODEL_PATH is missing or does not exist on worker host"
    if importlib.util.find_spec("geochat") is None or importlib.util.find_spec("torch") is None:
        return False, "Upstream geochat or torch runtime is not installed on worker host"
    return True, "GeoChat runtime and weights are ready"


app = FastAPI(title="SAATRAAI GeoChat Worker", version="0.1.0")


@app.get("/health")
def health(_: None = Depends(_require_token)) -> dict[str, object]:
    ready, detail = _runtime_ready()
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)
    return {"status": "ok", "ready": True, "model": "MBZUAI/geochat-7B", "version": "geochat-7B"}


async def _stage_upload(file: UploadFile) -> Path:
    suffix = Path(file.filename or "scene.png").suffix or ".png"
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Uploaded image is empty")
    temporary = NamedTemporaryFile(prefix="geochat-worker-", suffix=suffix, delete=False)
    temporary.write(content)
    temporary.close()
    return Path(temporary.name)


@app.post("/vqa")
async def infer_vqa(
    question: str = Form(min_length=1, max_length=2000),
    file: UploadFile = File(...),
    _: None = Depends(_require_token),
) -> dict[str, str]:
    model_path, model_base, device, max_new_tokens = _model_settings()
    ready, detail = _runtime_ready()
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

    staged = await _stage_upload(file)
    try:
        runner = GeoChatVqaRunner(model_path, model_base, device, max_new_tokens)
        answer = runner.answer(staged, question)
        return {"model": "MBZUAI/geochat-7B", "version": "geochat-7B", "answer": normalize_answer(answer)}
    except ModelUnavailableError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    finally:
        staged.unlink(missing_ok=True)


@app.post("/grounding")
async def infer_grounding(
    target: str = Form(min_length=1, max_length=500),
    file: UploadFile = File(...),
    _: None = Depends(_require_token),
) -> dict[str, object]:
    model_path, model_base, device, max_new_tokens = _model_settings()
    ready, detail = _runtime_ready()
    if not ready:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

    staged = await _stage_upload(file)
    try:
        runner = GeoChatGroundingRunner(model_path, model_base, device, max_new_tokens)
        boxes = runner.ground(staged, target)
        return {"model": "MBZUAI/geochat-7B", "version": "geochat-7B", "boxes": boxes}
    except ModelUnavailableError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    finally:
        staged.unlink(missing_ok=True)
