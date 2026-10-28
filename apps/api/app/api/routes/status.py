from __future__ import annotations

import os
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


def _tcp_reachable(url: str, timeout: float = 0.75) -> bool:
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, ValueError):
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
                detail="Connection successful",
            )
        )
    except Exception:  # noqa: BLE001 - status endpoint must never raise
        services.append(
            ServiceStatusResponse(id="database", label="PostgreSQL / PostGIS", state="offline")
        )

    redis_online = _tcp_reachable(settings.redis_url)
    services.append(
        ServiceStatusResponse(
            id="redis",
            label="Redis",
            state="online" if redis_online else "offline",
            detail="TCP endpoint reachable" if redis_online else "TCP endpoint unavailable",
        )
    )

    storage_path = Path(settings.local_storage_path)
    storage_writable = storage_path.is_dir() and os.access(storage_path, os.W_OK)
    services.append(
        ServiceStatusResponse(
            id="object_storage",
            label="Object storage (local)",
            state="online" if storage_writable else "degraded",
            detail=(
                "Storage directory is writable; durability is not tested by this probe"
                if storage_writable
                else "Storage directory is not writable or does not exist"
            ),
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
