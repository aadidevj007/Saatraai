from __future__ import annotations

import logging
import socket
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.core.config import get_settings
from app.db.session import get_db
from app.models.identity import User
from app.schemas.reasoning import ServiceStatusResponse, SystemStatusResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _tcp_reachable(url: str, timeout: float = 0.75) -> bool:
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@router.get(
    "/status",
    response_model=SystemStatusResponse,
    summary="System status",
    description=(
        "Reports live connectivity for backing services and explicit NOT_CONFIGURED state "
        "for integrations that are not deployed (satellite providers, graph database, models)."
    ),
    responses=ERROR_RESPONSES,
)
def system_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SystemStatusResponse:
    settings = get_settings()
    services: list[ServiceStatusResponse] = [
        ServiceStatusResponse(id="api", label="SAATRAAI API", state="online", detail="v0.1.0")
    ]

    try:
        db.execute(text("SELECT 1"))
        services.append(
            ServiceStatusResponse(
                id="database",
                label="PostgreSQL / PostGIS",
                state="online",
                detail=urlparse(settings.database_url).hostname or "configured",
            )
        )
    except Exception:  # noqa: BLE001 - status endpoint must never raise
        logger.exception("database status probe failed")
        services.append(
            ServiceStatusResponse(id="database", label="PostgreSQL / PostGIS", state="offline")
        )

    services.append(
        ServiceStatusResponse(
            id="redis",
            label="Redis",
            state="online" if _tcp_reachable(settings.redis_url) else "offline",
            detail=urlparse(settings.redis_url).netloc,
        )
    )

    storage_path = Path(settings.local_storage_path)
    if storage_path.exists():
        services.append(
            ServiceStatusResponse(
                id="object_storage",
                label="Object storage (local)",
                state="online",
                detail=str(storage_path),
            )
        )
    else:
        services.append(
            ServiceStatusResponse(
                id="object_storage",
                label="Object storage (local)",
                state="degraded",
                detail=f"path {storage_path} does not exist yet",
            )
        )

    if settings.geochat_model_path:
        services.append(
            ServiceStatusResponse(
                id="model_geochat",
                label="GeoChat (VQA / grounding)",
                state="degraded",
                detail="model path configured; runtime weights not verified by this probe",
            )
        )
    else:
        services.append(
            ServiceStatusResponse(
                id="model_geochat",
                label="GeoChat (VQA / grounding)",
                state="not_configured",
                detail="GEOCHAT_MODEL_PATH is unset — VQA and grounding tools are unavailable",
            )
        )

    services.extend(
        [
            ServiceStatusResponse(
                id="satellite_optical",
                label="Optical provider (Sentinel-2)",
                state="not_configured",
                detail="No catalog provider integration is deployed; imagery must be uploaded",
            ),
            ServiceStatusResponse(
                id="satellite_sar",
                label="SAR provider (Sentinel-1)",
                state="not_configured",
                detail="No catalog provider integration is deployed; imagery must be uploaded",
            ),
            ServiceStatusResponse(
                id="rainfall",
                label="Rainfall provider",
                state="not_configured",
                detail="No meteorological provider is configured",
            ),
            ServiceStatusResponse(
                id="graph_db",
                label="Neo4j graph database",
                state="not_configured",
                detail="Evidence graph is served from PostgreSQL relations",
            ),
        ]
    )

    return SystemStatusResponse(services=services, checked_at=datetime.now(UTC))
