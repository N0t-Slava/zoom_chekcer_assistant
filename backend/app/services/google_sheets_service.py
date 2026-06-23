import base64
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from ..config import (
    google_service_account_email,
    google_service_account_json,
    google_service_account_private_key,
)
from .table_import_service import ParsedTable, clean_cell, preview_rows, validate_table


SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
TOKEN_URL = "https://oauth2.googleapis.com/token"
SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets"


@dataclass(frozen=True)
class ServiceAccountCredentials:
    client_email: str
    private_key: str
    token_uri: str = TOKEN_URL


def get_service_account_credentials() -> ServiceAccountCredentials | None:
    raw_json = google_service_account_json()
    if raw_json:
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError:
            data = {}
        email = data.get("client_email")
        private_key = data.get("private_key")
        token_uri = data.get("token_uri") or TOKEN_URL
        if email and private_key:
            return ServiceAccountCredentials(email, private_key, token_uri)

    email = google_service_account_email()
    private_key = google_service_account_private_key()
    if email and private_key:
        return ServiceAccountCredentials(email, private_key.replace("\\n", "\n"))
    return None


def service_account_email_for_display() -> str | None:
    credentials = get_service_account_credentials()
    return credentials.client_email if credentials else google_service_account_email()


def is_google_sheets_configured() -> bool:
    return get_service_account_credentials() is not None


def extract_sheet_id(sheet_url: str) -> str:
    value = sheet_url.strip()
    parsed = urllib.parse.urlparse(value)
    if not parsed.scheme and "/" not in value and len(value) >= 20:
        return value

    parts = [part for part in parsed.path.split("/") if part]
    if "d" in parts:
        index = parts.index("d")
        if index + 1 < len(parts):
            return parts[index + 1]

    query = urllib.parse.parse_qs(parsed.query)
    for key in ("id", "key"):
        if query.get(key):
            return query[key][0]
    raise ValueError("Google Sheet URL must include a spreadsheet id.")


def values_to_table(values: list[list[object]]) -> ParsedTable:
    if not values:
        return ParsedTable(headers=[], rows=[])
    headers = [clean_cell(value) for value in values[0]]
    rows: list[dict[str, str]] = []
    for value_row in values[1:]:
        row: dict[str, str] = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            row[header] = clean_cell(value_row[index] if index < len(value_row) else "")
        if any(row.values()):
            rows.append(row)
    return ParsedTable(headers=[header for header in headers if header], rows=rows)


def list_sheet_tabs(sheet_id: str) -> list[str]:
    payload = _google_get(f"{SHEETS_API_BASE}/{urllib.parse.quote(sheet_id)}?fields=sheets.properties.title")
    sheets = payload.get("sheets", [])
    tabs = []
    for sheet in sheets if isinstance(sheets, list) else []:
        properties = sheet.get("properties", {}) if isinstance(sheet, dict) else {}
        title = properties.get("title")
        if title:
            tabs.append(str(title))
    return tabs


def read_sheet_table(sheet_id: str, tab_name: str, row_limit: int = 2000) -> ParsedTable:
    range_name = f"'{tab_name.replace(chr(39), chr(39) + chr(39))}'!A1:ZZ{row_limit}"
    encoded_range = urllib.parse.quote(range_name, safe="")
    url = f"{SHEETS_API_BASE}/{urllib.parse.quote(sheet_id)}/values/{encoded_range}?majorDimension=ROWS"
    payload = _google_get(url)
    values = payload.get("values", [])
    if not isinstance(values, list):
        values = []
    table = values_to_table(values)
    validate_table(table)
    return table


def preview_sheet_rows(sheet_id: str, tab_name: str) -> ParsedTable:
    table = read_sheet_table(sheet_id, tab_name, row_limit=25)
    return ParsedTable(headers=table.headers, rows=preview_rows(table.rows))


def _google_get(url: str) -> dict[str, object]:
    token = _access_token()
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ValueError(f"Google Sheets API error: {detail}") from exc


def _access_token() -> str:
    credentials = get_service_account_credentials()
    if credentials is None:
        raise ValueError("Google Sheets bot is not configured.")

    now = int(time.time())
    assertion = _jwt_assertion(credentials, now)
    body = urllib.parse.urlencode(
        {
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        credentials.token_uri,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ValueError(f"Google token error: {detail}") from exc

    token = payload.get("access_token")
    if not token:
        raise ValueError("Google token response did not include an access token.")
    return str(token)


def _jwt_assertion(credentials: ServiceAccountCredentials, now: int) -> str:
    header = {"alg": "RS256", "typ": "JWT"}
    claims = {
        "iss": credentials.client_email,
        "scope": SHEETS_SCOPE,
        "aud": credentials.token_uri,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = f"{_urlsafe_json(header)}.{_urlsafe_json(claims)}"
    private_key = serialization.load_pem_private_key(credentials.private_key.encode("utf-8"), password=None)
    signature = private_key.sign(signing_input.encode("ascii"), padding.PKCS1v15(), hashes.SHA256())
    return f"{signing_input}.{_urlsafe_b64(signature)}"


def _urlsafe_json(value: dict[str, object]) -> str:
    return _urlsafe_b64(json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8"))


def _urlsafe_b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
