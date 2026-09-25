from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.api.errors import ERROR_RESPONSES
from app.models.identity import User
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the authenticated user",
    responses=ERROR_RESPONSES,
)
def read_current_user(current_user: CurrentUser) -> User:
    return current_user
