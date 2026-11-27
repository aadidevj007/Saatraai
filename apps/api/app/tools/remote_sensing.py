from __future__ import annotations

import sys
from pathlib import Path

from app.core.config import get_settings
from app.tools.adapters import ModelAdapter
from app.tools.types import (
    EvidencePreflightParameters,
    GroundingToolOutput,
    GroundingParameters,
    NotImplementedToolOutput,
    ToolExecutionContext,
    VqaParameters,
    VqaToolOutput,
)


PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.common import ModelUnavailableError
from ml.change_detection.evidence_preflight import assess_pair
from ml.grounding import GeoChatGroundingRunner
from ml.vqa import GeoChatVqaRunner, normalize_answer


class BiTemporalEvidencePreflightAdapter(ModelAdapter):
    """Checks temporal-pair provenance and data validity without inferring change."""

    def execute(self, parameters: EvidencePreflightParameters, context: ToolExecutionContext | None = None):
        del parameters
        if context is None:
            return assess_pair((), ())
        return assess_pair(context.input_paths, context.input_ids, context.input_checksums)


class GeoChatVqaAdapter(ModelAdapter):
    tool_name = "optical-vqa"
    tool_version = "geochat-7B"

    def execute(self, parameters: VqaParameters, context: ToolExecutionContext | None = None):
        from app.services.geochat_remote import has_geochat_backend, run_geochat_vqa

        settings = get_settings()
        if not has_geochat_backend(settings):
            return NotImplementedToolOutput(
                tool_name=self.tool_name,
                tool_version=self.tool_version,
                message="GEOCHAT_MODEL_PATH is not configured; no model weights were loaded",
            )
        if context is None or len(context.input_paths) != 1:
            raise ValueError("GeoChat VQA requires one resolved input image")
        try:
            answer = run_geochat_vqa(settings, context.input_paths[0], parameters.question)
        except ModelUnavailableError as error:
            return NotImplementedToolOutput(
                tool_name=self.tool_name,
                tool_version=self.tool_version,
                message=str(error),
            )
        return VqaToolOutput(answer=normalize_answer(answer))


class GeoChatGroundingAdapter(ModelAdapter):
    tool_name = "visual-grounding"
    tool_version = "geochat-7B"

    def execute(self, parameters: GroundingParameters, context: ToolExecutionContext | None = None):
        from app.services.geochat_remote import has_geochat_backend, run_geochat_grounding

        settings = get_settings()
        if not has_geochat_backend(settings):
            return NotImplementedToolOutput(
                tool_name=self.tool_name,
                tool_version=self.tool_version,
                message="GEOCHAT_MODEL_PATH is not configured; no model weights were loaded",
            )
        if context is None or len(context.input_paths) != 1:
            raise ValueError("GeoChat grounding requires one resolved input image")
        try:
            boxes = run_geochat_grounding(settings, context.input_paths[0], parameters.target)
        except ModelUnavailableError as error:
            return NotImplementedToolOutput(
                tool_name=self.tool_name,
                tool_version=self.tool_version,
                message=str(error),
            )
        return GroundingToolOutput(boxes=boxes)


class OpenRouterVisionVqaAdapter(ModelAdapter):
    tool_name = "vqa-openrouter-vision"
    tool_version = "openrouter-v1"

    def execute(self, parameters: VqaParameters, context: ToolExecutionContext | None = None):
        from app.services.openrouter import openrouter_analyze_image

        settings = get_settings()
        if not settings.openrouter_api_key:
            return NotImplementedToolOutput(
                tool_name=self.tool_name,
                tool_version=self.tool_version,
                message="OPENROUTER_API_KEY is not configured; OpenRouter vision inference is unavailable",
            )
        if context is None or len(context.input_paths) != 1:
            raise ValueError("OpenRouter Vision VQA requires one resolved input image")
        try:
            answer = openrouter_analyze_image(
                settings.openrouter_api_key,
                settings.openrouter_model,
                context.input_paths[0],
                parameters.question,
                timeout=settings.openrouter_timeout_seconds,
            )
        except ModelUnavailableError as error:
            return NotImplementedToolOutput(
                tool_name=self.tool_name,
                tool_version=self.tool_version,
                message=str(error),
            )
        return VqaToolOutput(answer=normalize_answer(answer))
