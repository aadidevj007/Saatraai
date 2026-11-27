"""OpenRouter REST API client for structured corpus Information Extraction and vision VQA."""

from __future__ import annotations

import base64
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
from typing import Any

import httpx

from ml.common import ModelUnavailableError, prepare_rgb_image

OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://saatraai.vercel.app",
        "X-Title": "SAATRAAI",
    }


def _extract_message_text(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ModelUnavailableError("OpenRouter API returned no completion choices")
    first = choices[0] if isinstance(choices[0], dict) else {}
    message = first.get("message") if isinstance(first.get("message"), dict) else {}
    content = message.get("content")
    if isinstance(content, str):
        text = content.strip()
    elif isinstance(content, list):
        parts = [str(part.get("text", "")) for part in content if isinstance(part, dict) and part.get("text")]
        text = "\n".join(parts).strip()
    else:
        text = ""
    if not text:
        raise ModelUnavailableError("OpenRouter API returned an empty response")
    return text


def _strip_json_fences(raw: str) -> str:
    cleaned = raw.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fence:
        return fence.group(1).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


def check_openrouter_health(api_key: str, model: str, timeout: float = 3.5) -> tuple[bool, str]:
    """Verify OpenRouter API key validity without exposing credentials."""
    try:
        response = httpx.get(
            f"{OPENROUTER_API_BASE}/key",
            headers={"Authorization": f"Bearer {api_key.strip()}"},
            timeout=timeout,
            follow_redirects=False,
        )
    except httpx.HTTPError:
        return False, "OpenRouter API endpoint is unreachable"

    if response.status_code in {401, 403}:
        return False, "Configured OPENROUTER_API_KEY was rejected by OpenRouter"
    if response.status_code != 200:
        return False, f"OpenRouter API key probe returned HTTP {response.status_code}"
    return True, f"OpenRouter API ready ({model.strip()})"


def _post_chat(api_key: str, body: dict[str, Any], timeout: float) -> dict[str, Any]:
    try:
        response = httpx.post(
            f"{OPENROUTER_API_BASE}/chat/completions",
            headers=_headers(api_key),
            json=body,
            timeout=timeout,
            follow_redirects=False,
        )
    except httpx.HTTPError as error:
        raise ModelUnavailableError("OpenRouter API request failed due to a network error") from error

    if response.status_code in {401, 403}:
        raise ModelUnavailableError("Configured OPENROUTER_API_KEY was rejected by OpenRouter")
    if response.status_code in {402, 429} or response.status_code >= 500:
        raise ModelUnavailableError(f"OpenRouter API is unavailable (HTTP {response.status_code})")
    if response.status_code >= 400:
        raise ValueError(f"OpenRouter API rejected the request (HTTP {response.status_code})")

    try:
        data = response.json()
    except ValueError as error:
        raise ModelUnavailableError("OpenRouter API returned non-JSON HTTP response") from error
    if not isinstance(data, dict):
        raise ModelUnavailableError("OpenRouter API returned an invalid payload")
    return data


def openrouter_generate_json(
    api_key: str,
    model: str,
    system_instruction: str,
    user_prompt: str,
    response_schema: dict[str, Any],
    *,
    timeout: float = 45.0,
) -> dict[str, Any]:
    """Request structured JSON output from OpenRouter chat completions."""
    schema_hint = (
        "Return ONLY a single valid JSON object matching this JSON Schema "
        "(no markdown prose outside JSON):\n"
        f"{json.dumps(response_schema)}"
    )
    base_body: dict[str, Any] = {
        "model": model.strip(),
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": f"{system_instruction}\n\n{schema_hint}"},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        payload = _post_chat(api_key, {**base_body, "response_format": {"type": "json_object"}}, timeout)
    except ValueError:
        # Some community/free OpenRouter models disallow response_format; retry plain JSON-prompted chat.
        payload = _post_chat(api_key, base_body, timeout)

    try:
        raw_text = _extract_message_text(payload)
        parsed = json.loads(_strip_json_fences(raw_text))
    except (ValueError, json.JSONDecodeError) as error:
        raise ModelUnavailableError("OpenRouter API returned malformed JSON output") from error

    if not isinstance(parsed, dict):
        raise ModelUnavailableError("OpenRouter JSON response must be an object")
    return parsed


def openrouter_analyze_image(
    api_key: str,
    model: str,
    image_path: Path,
    question: str,
    *,
    timeout: float = 45.0,
) -> str:
    """Analyze a raster or optical scene with an OpenRouter multimodal model."""
    with TemporaryDirectory() as workspace:
        prepared = prepare_rgb_image(image_path, workspace)
        encoded = base64.b64encode(prepared.path.read_bytes()).decode("ascii")

    body: dict[str, Any] = {
        "model": model.strip(),
        "temperature": 0.1,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a cautious remote-sensing analyst. Describe only clearly visible features "
                    "in the provided Earth-observation or aerial scene, explicitly note ambiguity or "
                    "missing radiometric/calibration context, and avoid overclaiming causation."
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": question.strip()},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{encoded}"}},
                ],
            },
        ],
    }
    payload = _post_chat(api_key, body, timeout)
    try:
        return _extract_message_text(payload)
    except ValueError as error:
        raise ModelUnavailableError("OpenRouter vision returned an unreadable response") from error
