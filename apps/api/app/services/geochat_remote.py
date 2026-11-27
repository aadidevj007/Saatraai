"""HTTP client helpers for delegating GeoChat inference to a remote GPU worker."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import httpx

from ml.common import ModelUnavailableError, prepare_rgb_image
from ml.grounding.geochat import GeoChatGroundingRunner, parse_grounding_boxes
from ml.vqa.geochat import GeoChatVqaRunner, normalize_answer


def has_geochat_backend(settings: Any) -> bool:
    """Return True when either local weights or a remote GeoChat worker URL is configured."""
    local_ready = bool(settings.geochat_model_path and Path(settings.geochat_model_path).exists())
    return local_ready or bool(settings.geochat_remote_url)


def run_geochat_vqa(settings: Any, image_path: Path, question: str) -> str:
    """Run GeoChat VQA against local weights when present, else the configured remote worker."""
    if settings.geochat_model_path and Path(settings.geochat_model_path).exists():
        runner = GeoChatVqaRunner(
            settings.geochat_model_path,
            settings.geochat_model_base,
            settings.geochat_device,
            settings.geochat_max_new_tokens,
        )
        try:
            return normalize_answer(runner.answer(image_path, question))
        except ModelUnavailableError:
            if not settings.geochat_remote_url:
                raise
    if settings.geochat_remote_url:
        return remote_geochat_vqa(
            settings.geochat_remote_url,
            image_path,
            question,
            token=settings.geochat_remote_token,
            timeout=settings.geochat_remote_timeout_seconds,
        )
    raise ModelUnavailableError("GEOCHAT_MODEL_PATH is not configured; no model weights were loaded")


def run_geochat_grounding(
    settings: Any,
    image_path: Path,
    target: str,
) -> list[dict[str, float | None]]:
    """Run GeoChat grounding against local weights when present, else the configured remote worker."""
    if settings.geochat_model_path and Path(settings.geochat_model_path).exists():
        runner = GeoChatGroundingRunner(
            settings.geochat_model_path,
            settings.geochat_model_base,
            settings.geochat_device,
            settings.geochat_max_new_tokens,
        )
        try:
            return runner.ground(image_path, target)
        except ModelUnavailableError:
            if not settings.geochat_remote_url:
                raise
    if settings.geochat_remote_url:
        return remote_geochat_grounding(
            settings.geochat_remote_url,
            image_path,
            target,
            token=settings.geochat_remote_token,
            timeout=settings.geochat_remote_timeout_seconds,
        )
    raise ModelUnavailableError("GEOCHAT_MODEL_PATH is not configured; no model weights were loaded")


def _auth_headers(token: str | None) -> dict[str, str]:
    if token and token.strip():
        return {"Authorization": f"Bearer {token.strip()}"}
    return {}


def _endpoint(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def check_remote_geochat_health(
    base_url: str,
    token: str | None = None,
    timeout: float = 3.0,
) -> tuple[bool, str]:
    """Probe the remote GeoChat worker without disclosing its address or credentials."""
    try:
        response = httpx.get(
            _endpoint(base_url, "/health"),
            headers=_auth_headers(token),
            timeout=timeout,
            follow_redirects=False,
        )
    except httpx.HTTPError:
        return False, "Configured GEOCHAT_REMOTE_URL is unreachable or not ready"

    if response.status_code != 200:
        return False, "Configured GEOCHAT_REMOTE_URL is unreachable or not ready"

    try:
        payload: Any = response.json()
    except ValueError:
        return True, "Remote GeoChat inference service is reachable"

    if isinstance(payload, dict):
        status_value = str(payload.get("status", "")).strip().lower()
        ready_flag = payload.get("ready")
        if ready_flag is False or (status_value and status_value not in {"ok", "ready", "online"}):
            return False, "Configured GEOCHAT_REMOTE_URL is unreachable or not ready"

    return True, "Remote GeoChat inference service is reachable"


def _post_scene(
    base_url: str,
    path: str,
    image_path: Path,
    form_data: dict[str, str],
    *,
    token: str | None,
    timeout: float,
) -> tuple[dict[str, Any], int, int]:
    """Convert any GeoTIFF/image to normalized RGB PNG and POST it to the remote worker."""
    with TemporaryDirectory() as workspace:
        prepared = prepare_rgb_image(image_path, workspace)
        with prepared.path.open("rb") as handle:
            try:
                response = httpx.post(
                    _endpoint(base_url, path),
                    headers=_auth_headers(token),
                    data=form_data,
                    files={"file": ("scene.png", handle, "image/png")},
                    timeout=timeout,
                    follow_redirects=False,
                )
            except httpx.HTTPError as error:
                raise ModelUnavailableError("Remote GeoChat inference service is unreachable") from error

    if response.status_code in {401, 403}:
        raise ModelUnavailableError("Remote GeoChat inference service rejected credentials")
    if response.status_code in {501, 502, 503, 504} or response.status_code >= 500:
        raise ModelUnavailableError("Remote GeoChat inference service is unavailable")
    if response.status_code >= 400:
        raise ValueError(f"Remote GeoChat inference failed with status {response.status_code}")

    try:
        payload = response.json()
    except ValueError as error:
        raise ModelUnavailableError("Remote GeoChat inference service returned an invalid payload") from error

    if not isinstance(payload, dict):
        raise ModelUnavailableError("Remote GeoChat inference service returned an invalid payload")
    return payload, prepared.width, prepared.height


def remote_geochat_vqa(
    base_url: str,
    image_path: Path,
    question: str,
    *,
    token: str | None = None,
    timeout: float = 120.0,
) -> str:
    payload, _, _ = _post_scene(
        base_url,
        "/vqa",
        image_path,
        {"question": question},
        token=token,
        timeout=timeout,
    )
    answer = payload.get("answer")
    if not isinstance(answer, str):
        raise ValueError("GeoChat returned an empty answer")
    return normalize_answer(answer)


def remote_geochat_grounding(
    base_url: str,
    image_path: Path,
    target: str,
    *,
    token: str | None = None,
    timeout: float = 120.0,
) -> list[dict[str, float | None]]:
    payload, width, height = _post_scene(
        base_url,
        "/grounding",
        image_path,
        {"target": target},
        token=token,
        timeout=timeout,
    )
    raw_boxes = payload.get("boxes")
    if isinstance(raw_boxes, list):
        validated: list[dict[str, float | None]] = []
        for item in raw_boxes:
            if not isinstance(item, dict):
                continue
            try:
                x_min = float(item["x_min"])
                y_min = float(item["y_min"])
                x_max = float(item["x_max"])
                y_max = float(item["y_max"])
                angle_raw = item.get("angle_degrees")
                angle = float(angle_raw) if angle_raw is not None else None
            except (KeyError, TypeError, ValueError):
                continue
            if x_max > x_min >= 0 and y_max > y_min >= 0:
                validated.append(
                    {
                        "x_min": x_min,
                        "y_min": y_min,
                        "x_max": x_max,
                        "y_max": y_max,
                        "angle_degrees": angle,
                    }
                )
        if validated:
            return validated

    raw_text = payload.get("raw_text") or payload.get("generation")
    if isinstance(raw_text, str):
        boxes = parse_grounding_boxes(raw_text, width, height)
        if boxes:
            return boxes

    raise ValueError("GeoChat returned no valid grounding boxes")
