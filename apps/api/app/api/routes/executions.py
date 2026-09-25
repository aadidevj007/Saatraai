from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.db.session import get_db
from app.models.identity import User
from app.schemas.orchestration import ExecutionTraceResponse, OrchestrationRequest
from app.services.orchestration import OrchestrationController
from app.services.storage import ObjectStorage, get_object_storage

router = APIRouter()
controller = OrchestrationController()


@router.post(
    "/investigations/{investigation_id}/executions",
    response_model=ExecutionTraceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Route and execute an investigation task",
    description=(
        "Deterministically validates images, routes only through registered tools, and returns "
        "an observable execution trace. Current placeholder tools return NOT_IMPLEMENTED traces."
    ),
    responses={**ERROR_RESPONSES, 409: {"description": "Execution state conflict."}},
)
def execute_investigation_task(
    investigation_id: UUID,
    payload: OrchestrationRequest,
    idempotency_key: Annotated[
        str, Header(alias="Idempotency-Key", min_length=1, max_length=128)
    ],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: ObjectStorage = Depends(get_object_storage),
) -> ExecutionTraceResponse:
    return controller.execute(db, current_user, investigation_id, payload, idempotency_key, storage)


@router.get(
    "/investigations/{investigation_id}/executions/{task_id}",
    response_model=ExecutionTraceResponse,
    summary="Get an observable execution trace",
    description="Returns selected tool metadata and outcomes without internal reasoning content.",
    responses=ERROR_RESPONSES,
)
def get_execution_trace(
    investigation_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExecutionTraceResponse:
    return controller.get_trace(db, current_user, investigation_id, task_id)
