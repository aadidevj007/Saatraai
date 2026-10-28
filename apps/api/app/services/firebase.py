from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import get_settings


class FirebaseNotConfiguredError(RuntimeError):
    """Raised when Firebase Admin credentials are not available."""


_firebase_app: Any | None = None


def _get_firebase_app() -> Any:
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    settings = get_settings()
    if not settings.firebase_service_account_json and not settings.firebase_service_account_path:
        raise FirebaseNotConfiguredError(
            "Firebase is not configured; set FIREBASE_SERVICE_ACCOUNT_JSON or "
            "FIREBASE_SERVICE_ACCOUNT_PATH"
        )

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError as error:
        raise FirebaseNotConfiguredError("Install firebase-admin to enable Firebase authentication") from error

    if settings.firebase_service_account_json:
        try:
            service_account = json.loads(settings.firebase_service_account_json)
        except json.JSONDecodeError as error:
            raise FirebaseNotConfiguredError("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON") from error
        credential = credentials.Certificate(service_account)
    else:
        path = Path(settings.firebase_service_account_path or "")
        if not path.is_file():
            raise FirebaseNotConfiguredError(f"Firebase service account file does not exist: {path}")
        credential = credentials.Certificate(str(path))

    options = {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None
    _firebase_app = firebase_admin.initialize_app(credential, options)
    return _firebase_app


def verify_id_token(id_token: str) -> dict[str, Any]:
    try:
        from firebase_admin import auth

        return auth.verify_id_token(id_token, app=_get_firebase_app())
    except FirebaseNotConfiguredError:
        raise
    except Exception as error:
        raise ValueError("Firebase ID token is invalid or expired") from error