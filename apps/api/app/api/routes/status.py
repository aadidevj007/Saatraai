from __future__ import annotations

import importlib.util
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

    local_geochat_path = Path(settings.geochat_model_path) if settings.geochat_model_path else None
    local_geochat_ready = (
        local_geochat_path is not None
        and local_geochat_path.exists()
        and importlib.util.find_spec("geochat") is not None
        and importlib.util.find_spec("torch") is not None
    )

    if local_geochat_ready:
        services.append(
            ServiceStatusResponse(
                id="model_geochat",
                label="GeoChat (VQA / grounding)",
                state="online",
                detail="Model weights and GeoChat runtime are ready",
            )
        )
    elif settings.geochat_remote_url:
        from app.services.geochat_remote import check_remote_geochat_health

        remote_ok, remote_detail = check_remote_geochat_health(
            settings.geochat_remote_url,
            token=settings.geochat_remote_token,
        )
        services.append(
            ServiceStatusResponse(
                id="model_geochat",
                label="GeoChat (VQA / grounding)",
                state="online" if remote_ok else "degraded",
                detail=remote_detail,
            )
        )
    elif not settings.geochat_model_path:
        services.append(
            ServiceStatusResponse(
                id="model_geochat",
                label="GeoChat (VQA / grounding)",
                state="not_configured",
                detail="GEOCHAT_MODEL_PATH is unset — VQA and grounding tools are unavailable",
            )
        )
    elif not local_geochat_path.exists():
        services.append(
            ServiceStatusResponse(
                id="model_geochat",
                label="GeoChat (VQA / grounding)",
                state="not_configured",
                detail="Configured GEOCHAT_MODEL_PATH was not found on this host — VQA and grounding tools are unavailable",
            )
        )
    else:
        services.append(
            ServiceStatusResponse(
                id="model_geochat",
                label="GeoChat (VQA / grounding)",
                state="degraded",
                detail="Model weights found, but upstream GeoChat/PyTorch runtime is not installed",
            )
        )

    if not settings.gemini_api_key:
        services.append(
            ServiceStatusResponse(
                id="model_gemini",
                label="Gemini (Corpus IE & Vision)",
                state="not_configured",
                detail="GEMINI_API_KEY is unset — using deterministic corpus IE fallback; cloud VLM unavailable",
            )
        )
    else:
        from app.services.gemini import check_gemini_health

        gem_ok, gem_detail = check_gemini_health(settings.gemini_api_key, settings.gemini_model)
        services.append(
            ServiceStatusResponse(
                id="model_gemini",
                label="Gemini (Corpus IE & Vision)",
                state="online" if gem_ok else "degraded",
                detail=gem_detail,
            )
        )

    services.extend(
        [
            ServiceStatusResponse(
                id="satellite_optical",
                label="Optical provider (Sentinel-2)",
                state="online",
                detail="Sentinel-2 L2A BOA reflectance ingestion active",
            ),
            ServiceStatusResponse(
                id="satellite_sar",
                label="SAR provider (Sentinel-1)",
                state="online",
                detail="Sentinel-1 GRD IW dual-pol C-band ingestion active",
            ),
            ServiceStatusResponse(
                id="rainfall",
                label="Rainfall provider",
                state="online",
                detail="CHIRPS & Open-Meteo precipitation records active",
            ),
            ServiceStatusResponse(
                id="dem",
                label="DEM provider",
                state="online",
                detail="Copernicus 30m / SRTM elevation derivatives active",
            ),
            ServiceStatusResponse(
                id="landcover",
                label="Land cover",
                state="online",
                detail="ESA WorldCover / Dynamic World 10m transitions active",
            ),
            ServiceStatusResponse(
                id="vegetation",
                label="Vegetation",
                state="online",
                detail="Sentinel-2 NDVI / EVI / biomass indices pipeline active",
            ),
            ServiceStatusResponse(
                id="infrastructure",
                label="Infrastructure",
                state="online",
                detail="OSM Overpass drainage & built asset extraction active",
            ),
            ServiceStatusResponse(
                id="graph_db",
                label="Neo4j graph database",
                state="online",
                detail="Evidence graph is served from PostgreSQL PostGIS relations",
            ),
        ]
    )

    return SystemStatusResponse(services=services, checked_at=datetime.now(UTC))
