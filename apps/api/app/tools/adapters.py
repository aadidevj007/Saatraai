from __future__ import annotations

from abc import ABC, abstractmethod

from pydantic import BaseModel

from app.tools.types import NotImplementedToolOutput, ToolExecutionContext


class ModelAdapter(ABC):
    """Adapter boundary for integrated specialist models and external tools."""

    @abstractmethod
    def execute(self, parameters: BaseModel, context: ToolExecutionContext | None = None) -> BaseModel:
        """Execute a validated model invocation without making scientific claims here."""


class PlaceholderAdapter(ModelAdapter):
    """Temporary adapter used until a named specialist model is integrated."""

    def __init__(self, tool_name: str, tool_version: str) -> None:
        self.tool_name = tool_name
        self.tool_version = tool_version

    def execute(
        self, parameters: BaseModel, context: ToolExecutionContext | None = None
    ) -> NotImplementedToolOutput:
        return NotImplementedToolOutput(
            tool_name=self.tool_name,
            tool_version=self.tool_version,
            message="No production model adapter is integrated for this tool.",
        )
