from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.identity import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegistrationRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.geochat import FirebaseAuthResponse, FirebaseTokenRequest
from app.services.firebase import FirebaseNotConfiguredError, verify_id_token
from app.services.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth")


def issue_token_pair(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegistrationRequest, db: Session = Depends(get_db)) -> User:
    email = payload.email.strip().lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from error
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return issue_token_pair(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        user_id = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from error

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return issue_token_pair(user)


@router.post("/firebase", response_model=FirebaseAuthResponse)
def firebase_login(payload: FirebaseTokenRequest, db: Session = Depends(get_db)) -> FirebaseAuthResponse:
    id_token = payload.id_token
    if len(id_token) < 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Firebase ID token")
    try:
        claims = verify_id_token(id_token)
    except FirebaseNotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error

    email = claims.get("email")
    uid = claims.get("uid")
    if (
        not isinstance(email, str)
        or not isinstance(uid, str)
        or not email
        or claims.get("email_verified") is not True
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase account has no verified email")

    normalized_email = email.strip().lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None:
        user = User(
            email=normalized_email,
            display_name=claims.get("name") if isinstance(claims.get("name"), str) else None,
            password_hash=hash_password(f"firebase:{uid}:{id_token}"),
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            user = db.scalar(select(User).where(User.email == normalized_email))
            if user is None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from error
        else:
            db.refresh(user)

    return FirebaseAuthResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        firebase_uid=uid,
        user={"id": str(user.id), "email": user.email, "display_name": user.display_name},
    )
