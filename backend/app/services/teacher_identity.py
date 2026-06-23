from fastapi import Request
from sqlalchemy.orm import Session

from ..config import session_cookie_name
from .zoom_token_store import get_token_row


def request_session_id(request: Request) -> str | None:
    return request.cookies.get(session_cookie_name())


def teacher_owner_key(db: Session, request: Request) -> str | None:
    session_id = request_session_id(request)
    token = get_token_row(db, session_id)
    if token and token.zoom_email:
        return f"zoom-email:{token.zoom_email.strip().casefold()}"
    if token and token.zoom_user_id:
        return f"zoom-user:{token.zoom_user_id}"
    return f"session:{session_id}" if session_id else None
