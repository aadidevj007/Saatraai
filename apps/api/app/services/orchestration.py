from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
import json
from typing import Protocol
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.eo import ImageRelationship, ImageRelationshipType, UploadedImage
from app.models.execution import ExecutionStatus, ModelRun, Task
from app.models.identity import User
from app.models.investigation import Query
from app.models.reasoning import Evidence, EvidencePolarity
from app.schemas.orchestration import ExecutionTraceResponse, OrchestrationRequest
from app.services.authorization import get_owned_investigation
from app.services.storage import ObjectStorage
from app.tools.builtins import get_tool_registry
from app.tools.registry import ToolDefinition, ToolValidationError
from app.tools.types import InputConfiguration, ToolExecutionContext, ToolExecutionStatus, ToolInvocation, ToolTaskType


class OrchestrationTaskClass(str, Enum):
    SINGLE_IMAGE_VQA = "single_image_vqa"
    CAPTIONING = "captioning"
    GROUNDING = "grounding"
    BI_TEMPORAL_CHANGE = "bi_temporal_change"
    CHANGE_VQA = "change_vqa"
    OPTICAL_SAR_ANALYSIS = "optical_sar_analysis"


TASK_TOOL_TYPES = {
    OrchestrationTaskClass.SINGLE_IMAGE_VQA: ToolTaskType.VQA,
    OrchestrationTaskClass.CAPTIONING: ToolTaskType.CAPTIONING,
    OrchestrationTaskClass.GROUNDING: ToolTaskType.GROUNDING,
    OrchestrationTaskClass.BI_TEMPORAL_CHANGE: ToolTaskType.CHANGE_DETECTION,
    OrchestrationTaskClass.CHANGE_VQA: ToolTaskType.CHANGE_VQA,
    OrchestrationTaskClass.OPTICAL_SAR_ANALYSIS: ToolTaskType.OPTICAL_SAR,
}


class RoutingStrategy(Protocol):
    def classify(
        self, query: str, input_configuration: InputConfiguration
    ) -> OrchestrationTaskClass: ...


class DeterministicRoutingStrategy:
    """Keyword and input-configuration router; replaceable by a constrained future strategy."""

    def classify(
        self, query: str, input_configuration: InputConfiguration
    ) -> OrchestrationTaskClass:
        text = query.lower().strip()
        if input_configuration == InputConfiguration.CROSS_MODAL_PAIR:
            return OrchestrationTaskClass.OPTICAL_SAR_ANALYSIS
        if input_configuration == InputConfiguration.BI_TEMPORAL_PAIR:
            if any(marker in text for marker in ("what changed", "where changed", "explain change", "why changed")):
                return OrchestrationTaskClass.CHANGE_VQA
            return OrchestrationTaskClass.BI_TEMPORAL_CHANGE
        if any(marker in text for marker in ("caption", "describe the scene", "generate a description")):
            return OrchestrationTaskClass.CAPTIONING
        if any(marker in text for marker in ("locate", "ground", "where is", "find the")):
            return OrchestrationTaskClass.GROUNDING
        return OrchestrationTaskClass.SINGLE_IMAGE_VQA


@dataclass(frozen=True)
class ResolvedInputs:
    images: list[UploadedImage]
    input_configuration: InputConfiguration


def orchestration_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail={"message": "Orchestration validation failed", "errors": [{"field": "inputs", "message": message}]},
    )


class OrchestrationController:
    def __init__(self, routing_strategy: RoutingStrategy | None = None) -> None:
        self.routing_strategy = routing_strategy or DeterministicRoutingStrategy()
        self.registry = get_tool_registry()

    def execute(
        self,
        db: Session,
        user: User,
        investigation_id: UUID,
        payload: OrchestrationRequest,
        idempotency_key: str,
        storage: ObjectStorage,
    ) -> ExecutionTraceResponse:
        investigation = get_owned_investigation(db, investigation_id, user)
        existing = db.scalar(
            select(Task).where(
                Task.investigation_id == investigation_id,
                Task.idempotency_key == idempotency_key,
            )
        )
        if existing is not None:
            return self._trace(db, existing, idempotent_replay=True)

        resolved = self._resolve_inputs(db, investigation_id, payload.image_ids)
        task_class = self.routing_strategy.classify(payload.query, resolved.input_configuration)
        invocation = ToolInvocation(
            input_configuration=resolved.input_configuration,
            modalities=[image.metadata_record.modality for image in resolved.images if image.metadata_record],
            parameters=self._parameters_for(task_class, payload.query, payload.parameters),
        )
        tool = self._select_and_validate_tool(task_class, invocation)

        query = Query(investigation_id=investigation.id, text=payload.query.strip())
        task = Task(
            investigation_id=investigation.id,
            task_type=task_class.value,
            idempotency_key=idempotency_key,
            status=ExecutionStatus.RUNNING,
            payload={
                "query_id": None,
                "input_configuration": resolved.input_configuration.value,
                "selected_tool": tool.name,
                "parameters": invocation.parameters,
            },
        )
        db.add_all([query, task])
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            existing = db.scalar(
                select(Task).where(
                    Task.investigation_id == investigation_id,
                    Task.idempotency_key == idempotency_key,
                )
            )
            if existing is None:
                raise
            return self._trace(db, existing, idempotent_replay=True)

        task.payload = {**(task.payload or {}), "query_id": str(query.id)}
        run = ModelRun(
            task_id=task.id,
            model_name=tool.model_name,
            model_version=tool.version,
            tool_name=tool.name,
            parameters=invocation.parameters,
            input_ids=[str(image.id) for image in resolved.images],
            output_metadata={"output_references": []},
            status=ExecutionStatus.RUNNING,
            started_at=datetime.now(UTC),
        )
        db.add(run)
        db.flush()

        try:
            context = ToolExecutionContext(
                input_paths=tuple(storage.materialize(image.metadata_record.storage_location) for image in resolved.images)
            )
            output = self.registry.execute(tool.name, invocation, context)
            normalized_output = output.model_dump(mode="json")
            artifact = storage.store_bytes(
                json.dumps(normalized_output, sort_keys=True).encode("utf-8"), ".json"
            )
            run.output_metadata = {
                "output_references": [artifact.uri],
                "normalized_output": normalized_output,
            }
            if normalized_output.get("status") == ToolExecutionStatus.NOT_IMPLEMENTED.value:
                run.status = ExecutionStatus.FAILED
                task.status = ExecutionStatus.FAILED
                run.error_information = f"NOT_IMPLEMENTED: {normalized_output.get('message', 'model is unavailable')}"
                evidence = Evidence(
                    investigation_id=investigation.id,
                    query_id=query.id,
                    model_run_id=run.id,
                    polarity=EvidencePolarity.INSUFFICIENT,
                    summary="Selected tool is not implemented; no scientific output was produced.",
                    provenance={
                        "task_id": str(task.id),
                        "tool_name": tool.name,
                        "tool_version": tool.version,
                        "adapter_status": ToolExecutionStatus.NOT_IMPLEMENTED.value,
                    },
                )
                db.add(evidence)
            else:
                run.status = ExecutionStatus.SUCCEEDED
                task.status = ExecutionStatus.SUCCEEDED
                evidence = Evidence(
                    investigation_id=investigation.id,
                    query_id=query.id,
                    model_run_id=run.id,
                    image_id=resolved.images[0].id,
                    polarity=EvidencePolarity.NEUTRAL,
                    summary="Remote-sensing model output was generated; review the stored artifact for its normalized result.",
                    provenance={
                        "task_id": str(task.id),
                        "tool_name": tool.name,
                        "tool_version": tool.version,
                        "model_name": tool.model_name,
                        "model_output_artifact": artifact.uri,
                        "confidence_available": normalized_output.get("confidence") is not None,
                    },
                    source_uri=artifact.uri,
                )
                db.add(evidence)
        except Exception as error:
            run.status = ExecutionStatus.FAILED
            task.status = ExecutionStatus.FAILED
            run.error_information = f"EXECUTION_ERROR: {error}"
            run.output_metadata = {"output_references": []}
            evidence = Evidence(
                investigation_id=investigation.id,
                query_id=query.id,
                model_run_id=run.id,
                polarity=EvidencePolarity.INSUFFICIENT,
                summary="Tool execution failed; no scientific output was produced.",
                provenance={"task_id": str(task.id), "tool_name": tool.name, "error_type": type(error).__name__},
            )
            db.add(evidence)
        finally:
            run.completed_at = datetime.now(UTC)

        db.commit()
        db.refresh(task)
        return self._trace(db, task)

    def get_trace(
        self, db: Session, user: User, investigation_id: UUID, task_id: UUID
    ) -> ExecutionTraceResponse:
        get_owned_investigation(db, investigation_id, user)
        task = db.scalar(
            select(Task).where(Task.id == task_id, Task.investigation_id == investigation_id)
        )
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution trace not found")
        return self._trace(db, task)

    def _resolve_inputs(
        self, db: Session, investigation_id: UUID, image_ids: list[UUID]
    ) -> ResolvedInputs:
        if len(set(image_ids)) != len(image_ids):
            raise orchestration_error("Image IDs must be unique")
        images = db.scalars(
            select(UploadedImage).where(
                UploadedImage.investigation_id == investigation_id,
                UploadedImage.id.in_(image_ids),
            )
        ).all()
        if len(images) != len(image_ids) or any(image.metadata_record is None for image in images):
            raise orchestration_error("Every input image must belong to the investigation and have metadata")
        by_id = {image.id: image for image in images}
        ordered_images = [by_id[image_id] for image_id in image_ids]
        if len(ordered_images) == 1:
            return ResolvedInputs(ordered_images, InputConfiguration.SINGLE_IMAGE)

        relationship = db.scalar(
            select(ImageRelationship).where(
                or_(
                    and_(
                        ImageRelationship.source_image_id == image_ids[0],
                        ImageRelationship.related_image_id == image_ids[1],
                    ),
                    and_(
                        ImageRelationship.source_image_id == image_ids[1],
                        ImageRelationship.related_image_id == image_ids[0],
                    ),
                )
            )
        )
        if relationship is None:
            raise orchestration_error("Two images require a validated ingestion relationship")
        configuration = (
            InputConfiguration.CROSS_MODAL_PAIR
            if relationship.relationship_type == ImageRelationshipType.CROSS_MODAL
            else InputConfiguration.BI_TEMPORAL_PAIR
        )
        return ResolvedInputs(ordered_images, configuration)

    def _select_and_validate_tool(
        self, task_class: OrchestrationTaskClass, invocation: ToolInvocation
    ) -> ToolDefinition:
        try:
            candidates = self.registry.select(TASK_TOOL_TYPES[task_class], invocation)
            tool = candidates[0]
            tool.parameter_schema.model_validate(invocation.parameters)
            return tool
        except ToolValidationError as error:
            raise orchestration_error(str(error)) from error
        except Exception as error:
            raise orchestration_error("Parameters are not supported by the selected tool") from error

    @staticmethod
    def _parameters_for(
        task_class: OrchestrationTaskClass, query: str, parameters: dict
    ) -> dict:
        resolved = dict(parameters)
        if task_class in {OrchestrationTaskClass.SINGLE_IMAGE_VQA, OrchestrationTaskClass.CHANGE_VQA}:
            resolved.setdefault("question", query)
        elif task_class == OrchestrationTaskClass.GROUNDING:
            resolved.setdefault("target", query)
        return resolved

    @staticmethod
    def _trace(db: Session, task: Task, idempotent_replay: bool = False) -> ExecutionTraceResponse:
        run = db.scalar(select(ModelRun).where(ModelRun.task_id == task.id).order_by(ModelRun.created_at.desc()))
        if run is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Execution is not initialized")
        evidence = db.scalar(select(Evidence).where(Evidence.model_run_id == run.id).order_by(Evidence.created_at.desc()))
        payload = task.payload or {}
        output_metadata = run.output_metadata or {}
        return ExecutionTraceResponse(
            task_id=task.id,
            query_id=UUID(payload["query_id"]),
            selected_task=task.task_type,
            selected_tool=run.tool_name or run.model_name,
            model_version=run.model_version,
            parameters=run.parameters or {},
            input_ids=run.input_ids or [],
            status=run.status.value,
            started_at=run.started_at,
            completed_at=run.completed_at,
            output_references=output_metadata.get("output_references", []),
            error=run.error_information,
            evidence_id=evidence.id if evidence else None,
            idempotent_replay=idempotent_replay,
        )
