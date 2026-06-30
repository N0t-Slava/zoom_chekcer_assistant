import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Annotated
from urllib.parse import urlencode
from urllib.error import HTTPError
from urllib.request import Request as UrlRequest, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi import Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import allowed_zoom_emails, force_secure_cookies, is_production, session_cookie_name
from ..database import get_db
from ..models import ZoomSavedMeeting
from ..schemas import (
    ZoomMeetingCheckResponse,
    ZoomOAuthStatusResponse,
    ZoomSavedMeetingCreateRequest,
    ZoomSavedMeetingResponse,
    ZoomSdkConfigResponse,
    ZoomSdkSignatureRequest,
    ZoomSdkSignatureResponse,
    ZoomZakResponse,
)
from ..services.zoom_token_store import (
    decrypt_secret,
    delete_token,
    encrypt_secret,
    get_token_payload,
    get_token_row,
    save_token_payload,
    zoom_profile_display_name,
)
from ..services.time_service import app_now


router = APIRouter(prefix="/zoom", tags=["zoom"])
DbSession = Annotated[Session, Depends(get_db)]

DEFAULT_SDK_JS_URL = "https://source.zoom.us/3.13.2/zoom-meeting-3.13.2.min.js"
JWT_TTL_SECONDS = 2 * 60 * 60
ZOOM_AUTHORIZE_URL = "https://zoom.us/oauth/authorize"
ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
SESSION_COOKIE_NAME = session_cookie_name()

oauth_states: dict[str, str] = {}


def _client_id() -> str | None:
    return os.getenv("ZOOM_CLIENT_ID") or os.getenv("ZOOM_MEETING_SDK_CLIENT_ID")


def _client_secret() -> str | None:
    return os.getenv("ZOOM_CLIENT_SECRET") or os.getenv("ZOOM_MEETING_SDK_CLIENT_SECRET")


def _sdk_js_url() -> str:
    return os.getenv("ZOOM_MEETING_SDK_JS_URL", DEFAULT_SDK_JS_URL)


def _oauth_redirect_uri() -> str:
    return os.getenv("ZOOM_OAUTH_REDIRECT_URL", "http://127.0.0.1:8000/zoom/oauth/callback")


def _include_legacy_sdk_key_claim() -> bool:
    return os.getenv("ZOOM_SIGNATURE_INCLUDE_SDK_KEY", "").casefold() in {"1", "true", "yes"}


def _cookie_secure(request: Request) -> bool:
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    return force_secure_cookies() or request.url.scheme == "https" or forwarded_proto == "https"


def _zoom_email_allowed(email: str | None) -> bool:
    allowlist = allowed_zoom_emails()
    if "*" in allowlist:
        return True
    if is_production() and not allowlist:
        return False
    if not allowlist:
        return True
    return bool(email and email.casefold() in allowlist)


def _session_id_from_request(request: Request) -> str | None:
    session_id = request.cookies.get(session_cookie_name())
    if not session_id:
        return None
    return session_id


def _new_session_id() -> str:
    return secrets.token_urlsafe(32)


def _set_session_cookie(response: Response, request: Request, session_id: str) -> None:
    response.set_cookie(
        session_cookie_name(),
        session_id,
        httponly=True,
        secure=_cookie_secure(request),
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
    )


def _ensure_session_id(request: Request, response: Response) -> str:
    session_id = _session_id_from_request(request)
    if session_id:
        return session_id
    session_id = _new_session_id()
    _set_session_cookie(response, request, session_id)
    return session_id


def _base64_url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _meeting_sdk_jwt(client_id: str, client_secret: str, meeting_number: str, role: int) -> tuple[str, int]:
    issued_at = int(time.time()) - 30
    expires_at = issued_at + JWT_TTL_SECONDS
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "appKey": client_id,
        "mn": meeting_number,
        "role": role,
        "iat": issued_at,
        "exp": expires_at,
        "tokenExp": expires_at,
    }
    if _include_legacy_sdk_key_claim():
        payload["sdkKey"] = client_id
    encoded_header = _base64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _base64_url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(client_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{encoded_header}.{encoded_payload}.{_base64_url_encode(signature)}", expires_at


def _basic_auth_header(client_id: str, client_secret: str) -> str:
    token = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _post_zoom_token(params: dict[str, str]) -> dict[str, object]:
    client_id = _client_id()
    client_secret = _client_secret()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET before authorizing Zoom.",
        )

    query = urlencode(params)
    request = UrlRequest(
        f"{ZOOM_TOKEN_URL}?{query}",
        data=b"",
        method="POST",
        headers={"Authorization": _basic_auth_header(client_id, client_secret)},
    )
    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Zoom OAuth token request failed: HTTP {exc.code} {detail}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Zoom OAuth token request failed: {exc}",
        ) from exc

    payload["expires_at"] = int(time.time()) + int(payload.get("expires_in", 3600)) - 60
    return payload


def _authorized_token(db: Session, request: Request) -> dict[str, object]:
    session_id = _session_id_from_request(request)
    try:
        oauth_token = get_token_payload(db, session_id)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    if not oauth_token or not oauth_token.get("access_token"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorize Zoom first.",
        )

    expires_at = int(oauth_token.get("expires_at", 0))
    if expires_at > int(time.time()):
        return oauth_token

    refresh_token = oauth_token.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Zoom authorization expired. Authorize Zoom again.",
        )

    refreshed = _post_zoom_token(
        {
            "grant_type": "refresh_token",
            "refresh_token": str(refresh_token),
        }
    )
    if session_id:
        save_token_payload(db, session_id, refreshed)
    return refreshed


def _zoom_api_get_with_token(token: dict[str, object], path: str) -> dict[str, object]:
    api_url = str(token.get("api_url") or "https://api.zoom.us")
    api_request = UrlRequest(
        f"{api_url}{path}",
        method="GET",
        headers={"Authorization": f"Bearer {token['access_token']}"},
    )
    try:
        with urlopen(api_request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Zoom API request failed: HTTP {exc.code} {detail}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Zoom API request failed: {exc}",
        ) from exc


def _zoom_api_get(db: Session, request: Request, path: str) -> dict[str, object]:
    token = _authorized_token(db, request)
    return _zoom_api_get_with_token(token, path)


def _safe_meeting_settings(settings: object) -> dict[str, object]:
    if not isinstance(settings, dict):
        return {}

    allowed_keys = {
        "approval_type",
        "authentication_option",
        "enforce_login",
        "join_before_host",
        "meeting_authentication",
        "participant_video",
        "waiting_room",
    }
    return {key: settings[key] for key in allowed_keys if key in settings}


def _normalized_meeting_number(value: str) -> str:
    return "".join(character for character in value if character.isdigit())


def _saved_meeting_response(meeting: ZoomSavedMeeting) -> ZoomSavedMeetingResponse:
    try:
        passcode = decrypt_secret(meeting.passcode_encrypted)
    except RuntimeError:
        passcode = None
    return ZoomSavedMeetingResponse(
        id=meeting.id,
        meeting_number=meeting.meeting_number,
        title=meeting.title,
        passcode=passcode,
        join_as_host=bool(meeting.join_as_host),
        updated_at=meeting.updated_at,
    )


@router.get("/meeting-sdk/config", response_model=ZoomSdkConfigResponse)
async def meeting_sdk_config() -> ZoomSdkConfigResponse:
    client_id = _client_id()
    return ZoomSdkConfigResponse(
        configured=bool(client_id and _client_secret()),
        client_id=client_id,
        sdk_js_url=_sdk_js_url(),
    )


@router.get("/oauth/start")
async def zoom_oauth_start(
    request: Request,
    prompt: str | None = Query(default=None),
) -> RedirectResponse:
    client_id = _client_id()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set ZOOM_CLIENT_ID before authorizing Zoom.",
        )

    session_id = _session_id_from_request(request) or _new_session_id()
    state = secrets.token_urlsafe(24)
    oauth_states[state] = session_id
    oauth_params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": _oauth_redirect_uri(),
        "state": state,
    }
    if prompt:
        oauth_params["prompt"] = prompt
    params = urlencode(oauth_params)
    response = RedirectResponse(f"{ZOOM_AUTHORIZE_URL}?{params}")
    _set_session_cookie(response, request, session_id)
    return response


@router.get("/oauth/callback")
async def zoom_oauth_callback(
    request: Request,
    db: DbSession,
    code: str | None = None,
    state: str | None = None,
) -> RedirectResponse:
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth code.")
    if not state or state not in oauth_states:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state.")

    session_id = oauth_states.pop(state)
    token_payload = _post_zoom_token(
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": _oauth_redirect_uri(),
        }
    )
    save_token_payload(db, session_id, token_payload)
    try:
        user = _zoom_api_get_with_token(token_payload, "/v2/users/me")
    except HTTPException:
        user = None
    user_email = str(user.get("email")) if user and user.get("email") else None
    if not _zoom_email_allowed(user_email):
        delete_token(db, session_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This Zoom account is not allowed to access this app.",
        )
    save_token_payload(db, session_id, token_payload, user=user)
    response = RedirectResponse("/teacher-meeting?zoom_oauth=connected")
    _set_session_cookie(response, request, session_id)
    return response


@router.get("/oauth/status", response_model=ZoomOAuthStatusResponse)
async def zoom_oauth_status(request: Request, db: DbSession) -> ZoomOAuthStatusResponse:
    session_id = _session_id_from_request(request)
    token_row = get_token_row(db, session_id)
    if token_row is None:
        return ZoomOAuthStatusResponse(authorized=False)
    try:
        oauth_token = get_token_payload(db, session_id)
    except RuntimeError as exc:
        return ZoomOAuthStatusResponse(authorized=False, profile_error=str(exc))
    if not oauth_token or not oauth_token.get("access_token"):
        return ZoomOAuthStatusResponse(authorized=False)

    scopes = [
        scope
        for scope in str(oauth_token.get("scope") or "").split()
        if scope
    ]
    user: dict[str, object] = {}
    profile_error: str | None = None
    try:
        user = _zoom_api_get(db, request, "/v2/users/me")
        save_token_payload(db, session_id or "", oauth_token, user=user)
    except HTTPException as exc:
        user = {}
        profile_error = str(exc.detail)

    email = str(user.get("email") or token_row.zoom_email) if user.get("email") or token_row.zoom_email else None
    if not _zoom_email_allowed(email):
        return ZoomOAuthStatusResponse(
            authorized=False,
            profile_error="This Zoom account is not allowed to access this app.",
            email=email,
        )

    return ZoomOAuthStatusResponse(
        authorized=True,
        expires_at=oauth_token.get("expires_at"),
        api_url=oauth_token.get("api_url"),
        scopes=scopes,
        user_id=str(user.get("id") or token_row.zoom_user_id) if user.get("id") or token_row.zoom_user_id else None,
        account_id=str(user.get("account_id") or token_row.zoom_account_id) if user.get("account_id") or token_row.zoom_account_id else None,
        email=email,
        display_name=zoom_profile_display_name(user) or token_row.zoom_display_name,
        profile_error=profile_error,
    )


@router.post("/oauth/disconnect", response_model=ZoomOAuthStatusResponse)
async def zoom_oauth_disconnect(request: Request, db: DbSession) -> ZoomOAuthStatusResponse:
    session_id = _session_id_from_request(request)
    delete_token(db, session_id)
    for state, state_session_id in list(oauth_states.items()):
        if state_session_id == session_id:
            oauth_states.pop(state, None)
    return ZoomOAuthStatusResponse(authorized=False)


@router.get("/saved-meetings", response_model=list[ZoomSavedMeetingResponse])
async def list_saved_meetings(request: Request, db: DbSession) -> list[ZoomSavedMeetingResponse]:
    session_id = _session_id_from_request(request)
    if not session_id:
        return []

    meetings = db.scalars(
        select(ZoomSavedMeeting)
        .where(ZoomSavedMeeting.session_id == session_id)
        .order_by(ZoomSavedMeeting.updated_at.desc())
    ).all()
    return [_saved_meeting_response(meeting) for meeting in meetings]


@router.post("/saved-meetings", response_model=ZoomSavedMeetingResponse)
async def save_meeting(
    payload: ZoomSavedMeetingCreateRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> ZoomSavedMeetingResponse:
    session_id = _ensure_session_id(request, response)
    meeting_number = _normalized_meeting_number(payload.meeting_number)
    if not meeting_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Meeting number must contain digits.")

    meeting = db.scalar(
        select(ZoomSavedMeeting).where(
            ZoomSavedMeeting.session_id == session_id,
            ZoomSavedMeeting.meeting_number == meeting_number,
        )
    )
    now = app_now()
    if meeting is None:
        meeting = ZoomSavedMeeting(
            session_id=session_id,
            meeting_number=meeting_number,
            created_at=now,
            updated_at=now,
        )
        db.add(meeting)

    meeting.title = payload.title or None
    meeting.passcode_encrypted = encrypt_secret(payload.passcode) if payload.passcode else None
    meeting.join_as_host = 1 if payload.join_as_host else 0
    meeting.updated_at = now
    db.commit()
    db.refresh(meeting)
    return _saved_meeting_response(meeting)


@router.delete("/saved-meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_meeting(meeting_id: int, request: Request, db: DbSession) -> Response:
    session_id = _session_id_from_request(request)
    if not session_id:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    meeting = db.scalar(
        select(ZoomSavedMeeting).where(
            ZoomSavedMeeting.id == meeting_id,
            ZoomSavedMeeting.session_id == session_id,
        )
    )
    if meeting is not None:
        db.delete(meeting)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/meetings/{meeting_number}/check", response_model=ZoomMeetingCheckResponse)
async def zoom_meeting_check(request: Request, db: DbSession, meeting_number: str) -> ZoomMeetingCheckResponse:
    normalized_meeting_number = _normalized_meeting_number(meeting_number)
    if not normalized_meeting_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Meeting number must contain digits.")

    current_user: dict[str, object] = {}
    try:
        current_user = _zoom_api_get(db, request, "/v2/users/me")
    except HTTPException:
        current_user = {}

    try:
        meeting = _zoom_api_get(db, request, f"/v2/meetings/{normalized_meeting_number}")
    except HTTPException as exc:
        return ZoomMeetingCheckResponse(
            meeting_number=normalized_meeting_number,
            can_read=False,
            error=str(exc.detail),
            current_user_id=str(current_user.get("id")) if current_user.get("id") else None,
            current_user_email=str(current_user.get("email")) if current_user.get("email") else None,
        )

    current_user_id = str(current_user.get("id")) if current_user.get("id") else None
    host_id = str(meeting.get("host_id")) if meeting.get("host_id") else None
    return ZoomMeetingCheckResponse(
        meeting_number=normalized_meeting_number,
        can_read=True,
        id=str(meeting.get("id")) if meeting.get("id") else None,
        uuid=str(meeting.get("uuid")) if meeting.get("uuid") else None,
        host_id=host_id,
        host_email=str(meeting.get("host_email")) if meeting.get("host_email") else None,
        current_user_id=current_user_id,
        current_user_email=str(current_user.get("email")) if current_user.get("email") else None,
        owner_matches_authorized_user=bool(current_user_id and host_id and current_user_id == host_id),
        topic=str(meeting.get("topic")) if meeting.get("topic") else None,
        type=int(meeting["type"]) if isinstance(meeting.get("type"), int) else None,
        status=str(meeting.get("status")) if meeting.get("status") else None,
        has_password=bool(meeting.get("password") or meeting.get("encrypted_password")),
        settings=_safe_meeting_settings(meeting.get("settings")),
    )


@router.get("/oauth/zak", response_model=ZoomZakResponse)
async def zoom_oauth_zak(request: Request, db: DbSession) -> ZoomZakResponse:
    payload = _zoom_api_get(db, request, "/v2/users/me/token?type=zak")
    zak = payload.get("token")
    if not zak:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoom did not return a ZAK token. Check app scopes for user token access.",
        )
    return ZoomZakResponse(zak=str(zak))


@router.post("/meeting-sdk/signature", response_model=ZoomSdkSignatureResponse)
async def meeting_sdk_signature(payload: ZoomSdkSignatureRequest) -> ZoomSdkSignatureResponse:
    client_id = _client_id()
    client_secret = _client_secret()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET before joining with the Meeting SDK.",
        )

    meeting_number = "".join(character for character in payload.meeting_number if character.isdigit())
    if not meeting_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meeting number must contain digits.",
        )

    signature, expires_at = _meeting_sdk_jwt(
        client_id=client_id,
        client_secret=client_secret,
        meeting_number=meeting_number,
        role=payload.role,
    )
    return ZoomSdkSignatureResponse(
        signature=signature,
        client_id=client_id,
        meeting_number=meeting_number,
        role=payload.role,
        expires_at=expires_at,
    )
