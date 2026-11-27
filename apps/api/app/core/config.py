from functools import lru_cache
from ipaddress import ip_address
from typing import Literal
from urllib.parse import urlsplit

from pydantic import AliasChoices, Field, ValidationError, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEVELOPMENT_JWT_SECRET = "development-only-change-before-production"


class Settings(BaseSettings):
    app_name: str = "SAATRAAI API"
    app_version: str = "0.1.0"
    environment: Literal["development", "test", "production"] = "development"

    database_url: str = (
        "postgresql+psycopg://"
        "saatraai:saatraai_dev@localhost:5432/saatraai"
    )
    cors_allowed_origins: str | None = Field(
        default=None,
        validation_alias=AliasChoices("cors_allowed_origins", "cors_origins"),
    )

    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = Field(
        default=DEVELOPMENT_JWT_SECRET,
        validation_alias=AliasChoices("jwt_secret_key", "jwt_secret"),
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    local_storage_path: str = "data/uploads"
    max_upload_bytes: int = 100 * 1024 * 1024
    geochat_model_path: str | None = None
    geochat_model_base: str | None = None
    geochat_device: str = "cuda"
    geochat_max_new_tokens: int = 300
    geochat_remote_url: str | None = None
    geochat_remote_token: str | None = None
    geochat_remote_timeout_seconds: float = 120.0
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: float = 45.0
    firebase_project_id: str | None = None
    firebase_service_account_json: str | None = None
    firebase_service_account_path: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("database_url")
    @classmethod
    def require_database_url(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("DATABASE_URL must not be empty")
        if normalized.startswith("postgres://"):
            normalized = normalized.replace("postgres://", "postgresql+psycopg://", 1)
        elif normalized.startswith("postgresql://") and not normalized.startswith("postgresql+"):
            normalized = normalized.replace("postgresql://", "postgresql+psycopg://", 1)
        return normalized

    @field_validator("geochat_remote_url", mode="before")
    @classmethod
    def normalize_geochat_remote_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().rstrip("/")
        return normalized or None

    @field_validator("geochat_remote_token", "gemini_api_key", mode="before")
    @classmethod
    def normalize_optional_secret(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("geochat_remote_timeout_seconds")
    @classmethod
    def validate_geochat_remote_timeout(cls, value: float) -> float:
        if value <= 0 or value > 600:
            raise ValueError("GEOCHAT_REMOTE_TIMEOUT_SECONDS must be between 0 and 600")
        return value

    @field_validator("gemini_timeout_seconds")
    @classmethod
    def validate_gemini_timeout(cls, value: float) -> float:
        if value <= 0 or value > 300:
            raise ValueError("GEMINI_TIMEOUT_SECONDS must be between 0 and 300")
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def normalize_jwt_secret(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("JWT_SECRET_KEY must not be empty")
        return normalized

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        if self.environment == "production":
            if self.jwt_secret_key == DEVELOPMENT_JWT_SECRET or len(self.jwt_secret_key) < 32:
                raise ValueError("JWT_SECRET_KEY must be a unique secret of at least 32 characters in production")
            if self.database_url == (
                "postgresql+psycopg://saatraai:saatraai_dev@localhost:5432/saatraai"
            ):
                raise ValueError("DATABASE_URL must be explicitly configured in production")

        if self.geochat_remote_url is not None:
            parsed_remote = urlsplit(self.geochat_remote_url)
            if (
                parsed_remote.scheme not in {"http", "https"}
                or not parsed_remote.netloc
                or parsed_remote.username is not None
                or parsed_remote.password is not None
                or parsed_remote.query
                or parsed_remote.fragment
            ):
                raise ValueError("GEOCHAT_REMOTE_URL must be a valid HTTP(S) URL without credentials or query strings")
            if self.environment == "production":
                try:
                    remote_loopback = ip_address(parsed_remote.hostname or "").is_loopback
                except ValueError:
                    remote_loopback = False
                remote_host = (parsed_remote.hostname or "").lower()
                if (
                    parsed_remote.scheme != "https"
                    or remote_loopback
                    or remote_host == "localhost"
                    or remote_host.endswith(".localhost")
                ):
                    raise ValueError("GEOCHAT_REMOTE_URL must use HTTPS and cannot target localhost in production")

        origins = self.allowed_cors_origins
        if self.environment == "production" and not origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must contain at least one frontend origin in production")

        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.username is not None
                or parsed.password is not None
                or parsed.path
                or parsed.query
                or parsed.fragment
                or "*" in origin
            ):
                raise ValueError("CORS_ALLOWED_ORIGINS must contain exact origins without paths or wildcards")
            if self.environment == "production":
                try:
                    loopback = ip_address(parsed.hostname or "").is_loopback
                except ValueError:
                    loopback = False
                host = (parsed.hostname or "").lower()
                if parsed.scheme != "https" or loopback or host == "localhost" or host.endswith(".localhost"):
                    raise ValueError("Production CORS origins must use HTTPS and cannot be localhost")
        return self

    @property
    def allowed_cors_origins(self) -> list[str]:
        if self.cors_allowed_origins is None:
            return [] if self.environment == "production" else ["http://localhost:3000"]
        return list(dict.fromkeys(origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()))


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as error:
        # Pydantic's default validation string includes raw input values, which
        # can contain database credentials or JWT/service secrets.
        issues = "; ".join(
            f"{'.'.join(str(part) for part in item['loc']) or 'settings'}: {item['msg']}"
            for item in error.errors(include_input=False, include_context=False)
        )
        raise RuntimeError(f"Invalid API configuration: {issues}") from None
