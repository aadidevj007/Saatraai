from __future__ import annotations

from dataclasses import dataclass
from pydantic import BaseModel, ValidationError

from app.models.eo import ImageModality
from app.tools.adapters import ModelAdapter
from app.tools.types import InputConfiguration, ToolExecutionContext, ToolInvocation, ToolTaskType


class ToolValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    version: str
    model_name: str
    task_type: ToolTaskType
    accepted_modalities: frozenset[ImageModality]
    accepted_input_configurations: frozenset[InputConfiguration]
    parameter_schema: type[BaseModel]
    output_schema: type[BaseModel]
    adapter: ModelAdapter


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition) -> None:
        if tool.name in self._tools:
            raise ValueError(f"Tool '{tool.name}' is already registered")
        self._tools[tool.name] = tool

    def list_tools(self) -> list[ToolDefinition]:
        return sorted(self._tools.values(), key=lambda tool: tool.name)

    def get(self, name: str) -> ToolDefinition:
        try:
            return self._tools[name]
        except KeyError as error:
            raise ToolValidationError(f"Tool '{name}' is not registered") from error

    def select(
        self,
        task_type: ToolTaskType,
        invocation: ToolInvocation,
    ) -> list[ToolDefinition]:
        self._validate_structure(invocation)
        selected = [
            tool
            for tool in self._tools.values()
            if tool.task_type == task_type
            and invocation.input_configuration in tool.accepted_input_configurations
            and set(invocation.modalities).issubset(tool.accepted_modalities)
        ]
        if not selected:
            raise ToolValidationError("No registered tool accepts this task and input combination")
        return sorted(selected, key=lambda tool: tool.name)

    def execute(
        self, name: str, invocation: ToolInvocation, context: ToolExecutionContext | None = None
    ) -> BaseModel:
        tool = self.get(name)
        self._validate_structure(invocation)
        if invocation.input_configuration not in tool.accepted_input_configurations:
            raise ToolValidationError("Tool does not accept this input configuration")
        if not set(invocation.modalities).issubset(tool.accepted_modalities):
            raise ToolValidationError("Tool does not accept these image modalities")
        try:
            parameters = tool.parameter_schema.model_validate(invocation.parameters)
        except ValidationError as error:
            raise ToolValidationError("Tool parameters do not match the declared schema") from error
        return tool.adapter.execute(parameters, context)

    @staticmethod
    def _validate_structure(invocation: ToolInvocation) -> None:
        modalities = invocation.modalities
        if invocation.input_configuration == InputConfiguration.SINGLE_IMAGE and len(modalities) != 1:
            raise ToolValidationError("A single-image tool invocation requires exactly one modality")
        if invocation.input_configuration == InputConfiguration.CROSS_MODAL_PAIR:
            if len(modalities) != 2 or ImageModality.SAR not in modalities:
                raise ToolValidationError("A cross-modal pair requires SAR and one optical-family modality")
            if not ({ImageModality.OPTICAL, ImageModality.MULTISPECTRAL} & set(modalities)):
                raise ToolValidationError("A cross-modal pair requires an optical or multispectral modality")
        if invocation.input_configuration == InputConfiguration.BI_TEMPORAL_PAIR:
            if len(modalities) != 2 or modalities[0] != modalities[1]:
                raise ToolValidationError("A bi-temporal pair requires two inputs with the same modality")
