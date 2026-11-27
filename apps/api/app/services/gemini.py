"""Minimal Gemini REST API client for structured corpus IE and vision QA."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import httpx

from ml.common import ModelUnavailableError, prepare_rgb_image

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def _headers(api_key: str) -> dict[str, str]:
    return {
        "x-goog-api-key": api_key.strip(),
        "Content-Type": "application/json",
    }


def _model_endpoint(model: str, action: str | None = None) -> str:
    clean = model.strip().removeprefix("models/")
    base = f"{GEMINI_API_BASE}/models/{clean}"
    return f"{base}:{action}" if action else base


def _extract_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ModelUnavailableError("Gemini API returned no completion candidates")
    first = candidates[0] if isinstance(candidates[0], dict) else {}
    content = first.get("content") if isinstance(first.get("content"), dict) else {}
    parts = content.get("parts") if isinstance(content.get("parts"), list) else []
    texts = [str(part.get("text", "")) for part in parts if isinstance(part, dict) and part.get("text")]
    combined = "\n".join(texts).strip()
    if not combined:
        raise ModelUnavailableError("Gemini API returned an empty response")
    return combined


def check_gemini_health(api_key: str, model: str, timeout: float = 3.5) -> tuple[bool, str]:
    """Verify Gemini API reachability and key validity without exposing credentials."""
    try:
        response = httpx.get(
            _model_endpoint(model),
            headers={"x-goog-api-key": api_key.strip()},
            timeout=timeout,
            follow_redirects=False,
        )
    except httpx.HTTPError:
        return False, "Gemini API endpoint is unreachable"

    if response.status_code in {401, 403}:
        return False, "Configured GEMINI_API_KEY was rejected by the Gemini API"
    if response.status_code != 200:
        return False, f"Gemini API health probe returned HTTP {response.status_code}"
    return True, f"Gemini API ready ({model.strip()})"


def gemini_generate_json(
    api_key: str,
    model: str,
    system_instruction: str,
    user_prompt: str,
    response_schema: dict[str, Any],
    *,
    timeout: float = 45.0,
) -> dict[str, Any]:
    """Request structured JSON output from Gemini REST API."""
    body: dict[str, Any] = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
            "responseJsonSchema": response_schema,
        },
    }
    try:
        response = httpx.post(
            _model_endpoint(model, "generateContent"),
            headers=_headers(api_key),
            json=body,
            timeout=timeout,
            follow_redirects=False,
        )
    except httpx.HTTPError as error:
        raise ModelUnavailableError("Gemini API request failed due to a network error") from error

    if response.status_code in {401, 403}:
        raise ModelUnavailableError("Configured GEMINI_API_KEY was rejected by the Gemini API")
    if response.status_code == 429 or response.status_code >= 500:
        raise ModelUnavailableError(f"Gemini API is temporarily unavailable (HTTP {response.status_code})")
    if response.status_code >= 400:
        raise ValueError(f"Gemini API rejected the request (HTTP {response.status_code})")

    try:
        raw_text = _extract_text(response.json())
        parsed = json.loads(raw_text)
    except (ValueError, json.JSONDecodeError) as error:
        raise ModelUnavailableError("Gemini API returned malformed JSON output") from error

    if not isinstance(parsed, dict):
        raise ModelUnavailableError("Gemini API JSON response must be an object")
    return parsed


def gemini_analyze_image(
    api_key: str,
    model: str,
    image_path: Path,
    question: str,
    *,
    timeout: float = 45.0,
) -> str:
    """Analyze a raster or optical scene with Gemini multimodal vision."""
    with TemporaryDirectory() as workspace:
        prepared = prepare_rgb_image(image_path, workspace)
        encoded = base64.b64encode(prepared.path.read_bytes()).decode("ascii")

    body: dict[str, Any] = {
        "system_instruction": {
            "parts": [
                {
                    "text": (
                        "You are a cautious remote-sensing analyst. Describe only clearly visible features "
                        "in the provided Earth-observation or aerial scene, explicitly note ambiguity or "
                        "missing radiometric/calibration context, and avoid overclaiming causation."
                    )
                }
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": "image/png", "data": encoded}},
                    {"text": question.strip()},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.1},
    }
    try:
        response = httpx.post(
            _model_endpoint(model, "generateContent"),
            headers=_headers(api_key),
            json=body,
            timeout=timeout,
            follow_redirects=False,
        )
    except httpx.HTTPError as error:
        raise ModelUnavailableError("Gemini vision request failed due to a network error") from error

    if response.status_code in {401, 403}:
        raise ModelUnavailableError("Configured GEMINI_API_KEY was rejected by the Gemini API")
    if response.status_code == 429 or response.status_code >= 500:
        raise ModelUnavailableError(f"Gemini vision service unavailable (HTTP {response.status_code})")
    if response.status_code >= 400:
        raise ValueError(f"Gemini vision rejected the request (HTTP {response.status_code})")

    try:
        return _extract_text(response.json())
    except ValueError as error:
        raise ModelUnavailableError("Gemini vision returned an unreadable response") from error
