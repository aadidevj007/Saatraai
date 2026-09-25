from functools import lru_cache
from typing import Literal

from pydantic import model_validator
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

    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = DEVELOPMENT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    local_storage_path: str = "data/uploads"
    max_upload_bytes: int = 100 * 1024 * 1024
    geochat_model_path: str | None = None
    geochat_model_base: str | None = None
    geochat_device: str = "cuda"
    geochat_max_new_tokens: int = 300

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def require_production_jwt_secret(self) -> "Settings":
        if self.environment == "production" and self.jwt_secret_key == DEVELOPMENT_JWT_SECRET:
            raise ValueError("JWT_SECRET_KEY must be set in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
