import os
from datetime import UTC, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DEFAULT_APP_TIMEZONE = "Europe/Kyiv"


def app_timezone() -> ZoneInfo:
    timezone_name = os.getenv("APP_TIMEZONE", DEFAULT_APP_TIMEZONE)
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_APP_TIMEZONE)


def app_now() -> datetime:
    return datetime.now(app_timezone()).replace(tzinfo=None)


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
