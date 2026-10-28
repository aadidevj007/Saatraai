from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.errors import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import configure_logging
from app.core.config import Settings, get_settings


async def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "saatraai-api",
        "version": get_settings().app_version,
    }


async def root() -> dict[str, str]:
    return {"message": "SAATRAAI API is running"}


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    resolved_settings = settings or get_settings()
    application = FastAPI(
        title=resolved_settings.app_name,
        description="Satellite AI for Autonomous Temporal Reasoning and Analysis of Intelligence",
        version=resolved_settings.app_version,
    )
    application.add_exception_handler(StarletteHTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(Exception, unhandled_exception_handler)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.allowed_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    )
    application.include_router(api_router)

    application.add_api_route("/health", health_check, methods=["GET"])
    application.add_api_route("/", root, methods=["GET"])

    return application


app = create_app()
