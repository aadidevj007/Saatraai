import unittest
import os
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import DEVELOPMENT_JWT_SECRET, Settings, get_settings
from app.main import create_app


class ProductionSettingsTests(unittest.TestCase):
    def production_values(self) -> dict[str, str]:
        return {
            "environment": "production",
            "database_url": "postgresql+psycopg://user:password@db.example.test/saatraai",
            "jwt_secret_key": "unique-test-secret-value-" + ("x" * 32),
            "cors_allowed_origins": "https://saatraai.example.test",
        }

    def test_production_requires_strong_jwt_secret(self) -> None:
        values = self.production_values()
        values["jwt_secret_key"] = DEVELOPMENT_JWT_SECRET
        with self.assertRaisesRegex(ValueError, "JWT_SECRET_KEY"):
            Settings(_env_file=None, **values)

        values["jwt_secret_key"] = "too-short"
        with self.assertRaisesRegex(ValueError, "JWT_SECRET_KEY"):
            Settings(_env_file=None, **values)

    def test_production_requires_explicit_database_and_origins(self) -> None:
        values = self.production_values()
        values["cors_allowed_origins"] = ""
        with self.assertRaisesRegex(ValueError, "CORS_ALLOWED_ORIGINS"):
            Settings(_env_file=None, **values)

        values = self.production_values()
        values["database_url"] = "postgresql+psycopg://saatraai:saatraai_dev@localhost:5432/saatraai"
        with self.assertRaisesRegex(ValueError, "DATABASE_URL"):
            Settings(_env_file=None, **values)

    def test_production_rejects_insecure_or_wildcard_origins(self) -> None:
        for origin in ("http://saatraai.example.test", "https://*.example.test", "https://saatraai.example.test/path"):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                Settings(_env_file=None, **{**self.production_values(), "cors_allowed_origins": origin})

    def test_startup_configuration_errors_do_not_echo_secrets(self) -> None:
        fake_secret = "test-only-secret-sentinel-0123456789"
        with patch.dict(
            os.environ,
            {
                "ENVIRONMENT": "production",
                "DATABASE_URL": "postgresql+psycopg://fake-user:fake-password@db.invalid/test",
                "JWT_SECRET_KEY": fake_secret,
                "CORS_ALLOWED_ORIGINS": "",
            },
        ):
            get_settings.cache_clear()
            with self.assertRaises(RuntimeError) as raised:
                get_settings()
            self.assertNotIn(fake_secret, str(raised.exception))
            self.assertNotIn("fake-password", str(raised.exception))
        get_settings.cache_clear()
        get_settings()


class CorsTests(unittest.TestCase):
    def test_configured_origin_is_allowed_and_unconfigured_origin_is_not(self) -> None:
        settings = Settings(_env_file=None, cors_allowed_origins="https://saatraai.example.test")
        client = TestClient(create_app(settings))

        allowed = client.options(
            "/api/v1/projects",
            headers={
                "Origin": "https://saatraai.example.test",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.headers["access-control-allow-origin"], "https://saatraai.example.test")

        rejected = client.options(
            "/api/v1/projects",
            headers={
                "Origin": "https://unapproved.example.test",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization",
            },
        )
        self.assertNotIn("access-control-allow-origin", rejected.headers)

    def test_local_development_origin_remains_available_by_default(self) -> None:
        settings = Settings(_env_file=None, environment="development")
        self.assertEqual(settings.allowed_cors_origins, ["http://localhost:3000"])


if __name__ == "__main__":
    unittest.main()
