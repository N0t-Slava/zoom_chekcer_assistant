import os
from functools import lru_cache


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.casefold() in {"1", "true", "yes", "on"}


@lru_cache
def app_env() -> str:
    return os.getenv("APP_ENV", "development").strip().casefold() or "development"


def is_production() -> bool:
    return app_env() in {"prod", "production"}


def session_cookie_name() -> str:
    return os.getenv("SESSION_COOKIE_NAME", "class_tracker_teacher_session")


def force_secure_cookies() -> bool:
    return _bool_env("FORCE_SECURE_COOKIES", is_production())


def allowed_zoom_emails() -> set[str]:
    values = _split_csv(os.getenv("ALLOWED_ZOOM_EMAILS") or os.getenv("APP_ALLOWED_ZOOM_EMAILS"))
    return {value.casefold() for value in values}


def cors_allowed_origins() -> list[str]:
    origins = _split_csv(os.getenv("CORS_ALLOWED_ORIGINS"))
    if origins:
        return origins
    return [] if is_production() else ["*"]


def log_level() -> str:
    return os.getenv("LOG_LEVEL", "INFO").upper()
