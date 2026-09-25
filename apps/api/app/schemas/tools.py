from typing import Any

from pydantic import BaseModel


class RegisteredToolResponse(BaseModel):
    name: str
    version: str
    model_name: str
    task_type: str
    accepted_modalities: list[str]
    accepted_input_configurations: list[str]
    parameter_schema: dict[str, Any]
    output_schema: dict[str, Any]


class ToolRegistryResponse(BaseModel):
    tools: list[RegisteredToolResponse]
