from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from urllib.parse import urlparse
from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal
from app.main import app
from app.models.identity import User
from app.api.routes.status import _tcp_reachable


class StatusProbeTests(unittest.TestCase):
    def test_invalid_redis_url_is_reported_unreachable(self) -> None:
        self.assertFalse(_tcp_reachable("redis://localhost:not-a-port"))


class StatusApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.email = f"status-{uuid4()}@example.test"

    def tearDown(self) -> None:
        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.email == self.email))
            if user is not None:
                session.delete(user)
                session.commit()

    def authenticated_headers(self) -> dict[str, str]:
        self.client.post(
            "/api/v1/auth/register",
            json={"email": self.email, "password": "correct-horse-battery-staple"},
        )
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": "correct-horse-battery-staple"},
        )
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    def test_status_is_protected_and_does_not_expose_service_addresses_or_paths(self) -> None:
        self.assertEqual(self.client.get("/api/v1/status").status_code, 401)
        response = self.client.get("/api/v1/status", headers=self.authenticated_headers())
        self.assertEqual(response.status_code, 200, response.text)

        body = response.text
        settings = get_settings()
        database_host = urlparse(settings.database_url).hostname
        redis_address = urlparse(settings.redis_url).netloc
        self.assertNotIn(str(database_host), body)
        self.assertNotIn(redis_address, body)
        self.assertNotIn(settings.local_storage_path, body)

    def test_geochat_status_verifies_model_path_existence_and_runtime(self) -> None:
        headers = self.authenticated_headers()
        base = get_settings()

        missing_settings = Settings(
            database_url=base.database_url,
            redis_url=base.redis_url,
            jwt_secret_key=base.jwt_secret_key,
            geochat_model_path="./does-not-exist-geochat",
        )
        with patch("app.api.routes.status.get_settings", return_value=missing_settings):
            resp = self.client.get("/api/v1/status", headers=headers)
            self.assertEqual(resp.status_code, 200)
            geochat = next(s for s in resp.json()["services"] if s["id"] == "model_geochat")
            self.assertEqual(geochat["state"], "not_configured")
            self.assertNotIn("./does-not-exist-geochat", resp.text)

        with TemporaryDirectory() as tmpdir:
            present_settings = Settings(
                database_url=base.database_url,
                redis_url=base.redis_url,
                jwt_secret_key=base.jwt_secret_key,
                geochat_model_path=tmpdir,
            )
            with (
                patch("app.api.routes.status.get_settings", return_value=present_settings),
                patch("app.api.routes.status.importlib.util.find_spec", return_value=None),
            ):
                resp = self.client.get("/api/v1/status", headers=headers)
                self.assertEqual(resp.status_code, 200)
                geochat = next(s for s in resp.json()["services"] if s["id"] == "model_geochat")
                self.assertEqual(geochat["state"], "degraded")
                self.assertNotIn(Path(tmpdir).name, resp.text)


if __name__ == "__main__":
    unittest.main()
