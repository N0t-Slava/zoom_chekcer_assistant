import base64
import hashlib
import os
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import ZoomOAuthToken
from .time_service import app_now


def _secret() -> str:
    secret = (
        os.getenv("ZOOM_TOKEN_ENCRYPTION_KEY")
        or os.getenv("APP_SECRET_KEY")
        or os.getenv("ZOOM_CLIENT_SECRET")
        or os.getenv("ZOOM_MEETING_SDK_CLIENT_SECRET")
    )
    if not secret:
        raise RuntimeError("Set APP_SECRET_KEY or ZOOM_TOKEN_ENCRYPTION_KEY before storing Zoom tokens.")
    return secret


def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(_secret().encode("utf-8")).digest())
    return Fernet(key)


def encrypt_secret(value: object | None) -> str | None:
    if value is None:
        return None
    return _fernet().encrypt(str(value).encode("utf-8")).decode("ascii")


def decrypt_secret(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _fernet().decrypt(value.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise RuntimeError("Stored Zoom token cannot be decrypted. Re-authorize Zoom.") from exc


def get_token_row(db: Session, session_id: str | None) -> ZoomOAuthToken | None:
    if not session_id:
        return None
    return db.scalar(select(ZoomOAuthToken).where(ZoomOAuthToken.session_id == session_id))


def get_token_payload(db: Session, session_id: str | None) -> dict[str, Any] | None:
    token = get_token_row(db, session_id)
    if token is None:
        return None

    return {
        "access_token": decrypt_secret(token.access_token_encrypted),
        "refresh_token": decrypt_secret(token.refresh_token_encrypted),
        "token_type": token.token_type,
        "scope": token.scope,
        "api_url": token.api_url,
        "expires_at": token.expires_at,
        "zoom_user_id": token.zoom_user_id,
        "zoom_account_id": token.zoom_account_id,
        "zoom_email": token.zoom_email,
        "zoom_display_name": token.zoom_display_name,
    }


def save_token_payload(
    db: Session,
    session_id: str,
    payload: dict[str, Any],
    user: dict[str, object] | None = None,
) -> ZoomOAuthToken:
    token = get_token_row(db, session_id)
    now = app_now()
    if token is None:
        token = ZoomOAuthToken(
            session_id=session_id,
            access_token_encrypted="",
            expires_at=0,
            created_at=now,
            updated_at=now,
        )
        db.add(token)

    token.access_token_encrypted = encrypt_secret(payload.get("access_token")) or ""
    if payload.get("refresh_token"):
        token.refresh_token_encrypted = encrypt_secret(payload.get("refresh_token"))
    token.token_type = str(payload.get("token_type")) if payload.get("token_type") else None
    token.scope = str(payload.get("scope")) if payload.get("scope") else None
    token.api_url = str(payload.get("api_url")) if payload.get("api_url") else None
    token.expires_at = int(payload.get("expires_at", 0))
    if user:
        token.zoom_user_id = str(user.get("id")) if user.get("id") else None
        token.zoom_account_id = str(user.get("account_id")) if user.get("account_id") else None
        token.zoom_email = str(user.get("email")) if user.get("email") else None
        token.zoom_display_name = str(user.get("display_name")) if user.get("display_name") else None
    token.updated_at = now
    db.commit()
    db.refresh(token)
    return token


def delete_token(db: Session, session_id: str | None) -> None:
    token = get_token_row(db, session_id)
    if token is None:
        return
    db.delete(token)
    db.commit()
