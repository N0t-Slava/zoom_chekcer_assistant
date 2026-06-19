import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse

from ..schemas import (
    ZoomOAuthStatusResponse,
    ZoomSdkConfigResponse,
    ZoomSdkSignatureRequest,
    ZoomSdkSignatureResponse,
    ZoomZakResponse,
)


router = APIRouter(prefix="/zoom", tags=["zoom"])

DEFAULT_SDK_JS_URL = "https://source.zoom.us/3.13.2/zoom-meeting-3.13.2.min.js"
JWT_TTL_SECONDS = 2 * 60 * 60
ZOOM_AUTHORIZE_URL = "https://zoom.us/oauth/authorize"
ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"

oauth_states: set[str] = set()
oauth_token: dict[str, object] = {}


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
    request = Request(
        f"{ZOOM_TOKEN_URL}?{query}",
        data=b"",
        method="POST",
        headers={"Authorization": _basic_auth_header(client_id, client_secret)},
    )
    try:
        with urlopen(request, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Zoom OAuth token request failed: {exc}",
        ) from exc

    payload["expires_at"] = int(time.time()) + int(payload.get("expires_in", 3600)) - 60
    return payload


def _store_oauth_token(payload: dict[str, object]) -> None:
    oauth_token.clear()
    oauth_token.update(payload)


def _authorized_token() -> dict[str, object]:
    if not oauth_token.get("access_token"):
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
    _store_oauth_token(refreshed)
    return oauth_token


def _zoom_api_get(path: str) -> dict[str, object]:
    token = _authorized_token()
    api_url = str(token.get("api_url") or "https://api.zoom.us")
    request = Request(
        f"{api_url}{path}",
        method="GET",
        headers={"Authorization": f"Bearer {token['access_token']}"},
    )
    try:
        with urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Zoom API request failed: {exc}",
        ) from exc


@router.get("/meeting-sdk/config", response_model=ZoomSdkConfigResponse)
async def meeting_sdk_config() -> ZoomSdkConfigResponse:
    client_id = _client_id()
    return ZoomSdkConfigResponse(
        configured=bool(client_id and _client_secret()),
        client_id=client_id,
        sdk_js_url=_sdk_js_url(),
    )


@router.get("/oauth/start")
async def zoom_oauth_start() -> RedirectResponse:
    client_id = _client_id()
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Set ZOOM_CLIENT_ID before authorizing Zoom.",
        )

    state = secrets.token_urlsafe(24)
    oauth_states.add(state)
    params = urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": _oauth_redirect_uri(),
            "state": state,
        }
    )
    return RedirectResponse(f"{ZOOM_AUTHORIZE_URL}?{params}")


@router.get("/oauth/callback")
async def zoom_oauth_callback(code: str | None = None, state: str | None = None) -> RedirectResponse:
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth code.")
    if not state or state not in oauth_states:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state.")

    oauth_states.discard(state)
    token_payload = _post_zoom_token(
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": _oauth_redirect_uri(),
        }
    )
    _store_oauth_token(token_payload)
    return RedirectResponse("/teacher-meeting?zoom_oauth=connected")


@router.get("/oauth/status", response_model=ZoomOAuthStatusResponse)
async def zoom_oauth_status() -> ZoomOAuthStatusResponse:
    return ZoomOAuthStatusResponse(
        authorized=bool(oauth_token.get("access_token")),
        expires_at=oauth_token.get("expires_at") if oauth_token.get("access_token") else None,
        api_url=oauth_token.get("api_url") if oauth_token.get("access_token") else None,
    )


@router.get("/oauth/zak", response_model=ZoomZakResponse)
async def zoom_oauth_zak() -> ZoomZakResponse:
    payload = _zoom_api_get("/v2/users/me/token?type=zak")
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
