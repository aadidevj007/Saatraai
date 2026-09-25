from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CredentialsRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if email.count("@") != 1 or email.startswith("@") or email.endswith("@"):
            raise ValueError("email must be valid")
        return email


class RegistrationRequest(CredentialsRequest):
    password: str = Field(min_length=12, max_length=256)
    display_name: str | None = Field(default=None, max_length=255)


class LoginRequest(CredentialsRequest):
    password: str = Field(min_length=1, max_length=256)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str | None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
