from __future__ import annotations

from functools import lru_cache

from app.models.eo import ImageModality
from app.tools.adapters import PlaceholderAdapter
from app.tools.remote_sensing import GeoChatGroundingAdapter, GeoChatVqaAdapter
from app.tools.registry import ToolDefinition, ToolRegistry
from app.tools.types import (
    CaptioningParameters,
    ChangeDetectionParameters,
    ChangeVqaParameters,
    GroundingParameters,
    InputConfiguration,
    NotImplementedToolOutput,
    OpticalSarParameters,
    ToolTaskType,
    GroundingToolOutput,
    VqaToolOutput,
    VqaParameters,
)


@lru_cache
def get_tool_registry() -> ToolRegistry:
    registry = ToolRegistry()
    definitions = [
        ("optical-vqa", "MBZUAI/geochat-7B", "geochat-7B", ToolTaskType.VQA, {ImageModality.OPTICAL, ImageModality.MULTISPECTRAL}, {InputConfiguration.SINGLE_IMAGE}, VqaParameters, VqaToolOutput, GeoChatVqaAdapter()),
        ("image-captioning", "unintegrated", "0.1.0-placeholder", ToolTaskType.CAPTIONING, {ImageModality.OPTICAL, ImageModality.MULTISPECTRAL, ImageModality.SAR}, {InputConfiguration.SINGLE_IMAGE}, CaptioningParameters, NotImplementedToolOutput, None),
        ("visual-grounding", "MBZUAI/geochat-7B", "geochat-7B", ToolTaskType.GROUNDING, {ImageModality.OPTICAL, ImageModality.MULTISPECTRAL}, {InputConfiguration.SINGLE_IMAGE}, GroundingParameters, GroundingToolOutput, GeoChatGroundingAdapter()),
        ("bi-temporal-change-detection", "unintegrated", "0.1.0-placeholder", ToolTaskType.CHANGE_DETECTION, {ImageModality.OPTICAL, ImageModality.MULTISPECTRAL, ImageModality.SAR}, {InputConfiguration.BI_TEMPORAL_PAIR}, ChangeDetectionParameters, NotImplementedToolOutput, None),
        ("bi-temporal-change-vqa", "unintegrated", "0.1.0-placeholder", ToolTaskType.CHANGE_VQA, {ImageModality.OPTICAL, ImageModality.MULTISPECTRAL, ImageModality.SAR}, {InputConfiguration.BI_TEMPORAL_PAIR}, ChangeVqaParameters, NotImplementedToolOutput, None),
        ("optical-sar-fusion", "unintegrated", "0.1.0-placeholder", ToolTaskType.OPTICAL_SAR, {ImageModality.OPTICAL, ImageModality.MULTISPECTRAL, ImageModality.SAR}, {InputConfiguration.CROSS_MODAL_PAIR}, OpticalSarParameters, NotImplementedToolOutput, None),
    ]
    for name, model_name, version, task_type, modalities, configurations, parameter_schema, output_schema, adapter in definitions:
        registry.register(
            ToolDefinition(
                name=name,
                version=version,
                model_name=model_name,
                task_type=task_type,
                accepted_modalities=frozenset(modalities),
                accepted_input_configurations=frozenset(configurations),
                parameter_schema=parameter_schema,
                output_schema=output_schema,
                adapter=adapter or PlaceholderAdapter(name, version),
            )
        )
    return registry
