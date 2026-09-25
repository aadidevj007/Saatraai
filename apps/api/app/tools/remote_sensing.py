from __future__ import annotations

import sys
from pathlib import Path

from app.core.config import get_settings
from app.tools.adapters import ModelAdapter
from app.tools.types import (
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
from ml.grounding import GeoChatGroundingRunner
from ml.vqa import GeoChatVqaRunner, normalize_answer


class GeoChatVqaAdapter(ModelAdapter):
    tool_name = "optical-vqa"
    tool_version = "geochat-7B"

    def execute(self, parameters: VqaParameters, context: ToolExecutionContext | None = None):
        settings = get_settings()
        runner = GeoChatVqaRunner(
            settings.geochat_model_path,
            settings.geochat_model_base,
            settings.geochat_device,
            settings.geochat_max_new_tokens,
        )
        if context is None or len(context.input_paths) != 1:
            if not settings.geochat_model_path:
                return NotImplementedToolOutput(
                    tool_name=self.tool_name,
                    tool_version=self.tool_version,
                    message="GEOCHAT_MODEL_PATH is not configured; no model weights were loaded",
                )
            raise ValueError("GeoChat VQA requires one resolved input image")
        try:
            answer = runner.answer(context.input_paths[0], parameters.question)
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
        settings = get_settings()
        runner = GeoChatGroundingRunner(
            settings.geochat_model_path,
            settings.geochat_model_base,
            settings.geochat_device,
            settings.geochat_max_new_tokens,
        )
        if context is None or len(context.input_paths) != 1:
            if not settings.geochat_model_path:
                return NotImplementedToolOutput(
                    tool_name=self.tool_name,
                    tool_version=self.tool_version,
                    message="GEOCHAT_MODEL_PATH is not configured; no model weights were loaded",
                )
            raise ValueError("GeoChat grounding requires one resolved input image")
        try:
            boxes = runner.ground(context.input_paths[0], parameters.target)
        except ModelUnavailableError as error:
            return NotImplementedToolOutput(
                tool_name=self.tool_name,
                tool_version=self.tool_version,
                message=str(error),
            )
        return GroundingToolOutput(boxes=boxes)
