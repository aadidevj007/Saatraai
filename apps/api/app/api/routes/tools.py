from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.models.identity import User
from app.schemas.tools import RegisteredToolResponse, ToolRegistryResponse
from app.tools.builtins import get_tool_registry

router = APIRouter()


@router.get(
    "/tools",
    response_model=ToolRegistryResponse,
    summary="List registered specialist tools",
    description="Returns declared capabilities and schemas. It does not execute models.",
    responses=ERROR_RESPONSES,
)
def list_registered_tools(
    current_user: User = Depends(get_current_user),
) -> ToolRegistryResponse:
    tools = get_tool_registry().list_tools()
    return ToolRegistryResponse(
        tools=[
            RegisteredToolResponse(
                name=tool.name,
                version=tool.version,
                model_name=tool.model_name,
                task_type=tool.task_type.value,
                accepted_modalities=sorted(modality.value for modality in tool.accepted_modalities),
                accepted_input_configurations=sorted(
                    configuration.value for configuration in tool.accepted_input_configurations
                ),
                parameter_schema=tool.parameter_schema.model_json_schema(),
                output_schema=tool.output_schema.model_json_schema(),
            )
            for tool in tools
        ]
    )
