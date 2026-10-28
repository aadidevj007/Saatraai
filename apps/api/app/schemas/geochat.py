from typing import Any

from pydantic import BaseModel


class FirebaseTokenRequest(BaseModel):
    id_token: str


class GeoChatVqaResponse(BaseModel):
    model: str
    version: str
    answer: str


class GeoChatGroundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    angle_degrees: float | None = None


class GeoChatGroundingResponse(BaseModel):
    model: str
    version: str
    boxes: list[GeoChatGroundingBox]


class FirebaseAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    firebase_uid: str
    user: dict[str, Any]