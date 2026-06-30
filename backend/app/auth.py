from dataclasses import dataclass

from fastapi import Request

from .config import allowed_zoom_emails, is_production, session_cookie_name
from .database import SessionLocal
from .services.zoom_token_store import get_token_payload, get_token_row


PUBLIC_PATHS = {
    "/health",
    "/zoom/oauth/start",
    "/zoom/oauth/callback",
    "/zoom/oauth/status",
}

PUBLIC_PREFIXES = (
    "/static/",
)


@dataclass(frozen=True)
class AuthResult:
    authorized: bool
    reason: str = ""
    email: str | None = None


def is_public_path(path: str) -> bool:
    if path in PUBLIC_PATHS:
        return True
    return any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES)


def zoom_session_auth(request: Request) -> AuthResult:
    session_id = request.cookies.get(session_cookie_name())
    if not session_id:
        return AuthResult(False, "missing_session")

    with SessionLocal() as db:
        token_row = get_token_row(db, session_id)
        if token_row is None:
            return AuthResult(False, "missing_token")
        try:
            token_payload = get_token_payload(db, session_id)
        except RuntimeError:
            return AuthResult(False, "invalid_token")

        if not token_payload or not token_payload.get("access_token"):
            return AuthResult(False, "missing_access_token")

        email = token_row.zoom_email
        allowlist = allowed_zoom_emails()
        if "*" in allowlist:
            return AuthResult(True, email=email)
        if is_production() and not allowlist:
            return AuthResult(False, "allowlist_required", email=email)
        if allowlist and (not email or email.casefold() not in allowlist):
            return AuthResult(False, "email_not_allowed", email=email)

    return AuthResult(True, email=email)
