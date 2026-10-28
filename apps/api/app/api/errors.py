from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.common import ErrorResponse

ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Authentication is required."},
    404: {"model": ErrorResponse, "description": "Resource was not found."},
    422: {"model": ErrorResponse, "description": "Request validation failed."},
}


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    if isinstance(exc.detail, dict):
        message = exc.detail.get("message", "Request failed")
        details = exc.detail.get("errors")
    else:
        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        details = None
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"http_{exc.status_code}",
                "message": message,
                "details": details,
            }
        },
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # ValidationError entries include the rejected input by default. Redact it
    # so invalid passwords, tokens, and private request values never echo back.
    safe_details = [
        {
            key: value
            for key, value in item.items()
            if key in {"loc", "msg", "type"}
        }
        for item in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed",
                "details": jsonable_encoder(safe_details),
            }
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "internal_error",
                "message": "An unexpected server error occurred",
                "details": None,
            }
        },
    )
