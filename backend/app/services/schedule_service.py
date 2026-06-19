import csv
import io
import re
from datetime import date, datetime, time

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import ScheduleEntry
from .time_service import app_now


WHITESPACE_RE = re.compile(r"\s+")
TIME_FORMATS = ("%H:%M", "%H:%M:%S")
DATE_FORMATS = ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y")


def current_time() -> datetime:
    return app_now()


def clean_value(value: str | None) -> str:
    return WHITESPACE_RE.sub(" ", value or "").strip()


def _pick_value(row: dict[str, str], *keys: str) -> str:
    normalized_row = {key.strip().casefold(): value for key, value in row.items() if key}
    for key in keys:
        value = normalized_row.get(key)
        if value is not None:
            return clean_value(value)
    return ""


def _parse_date(value: str) -> date:
    for date_format in DATE_FORMATS:
        try:
            return datetime.strptime(value, date_format).date()
        except ValueError:
            continue
    raise ValueError(f"unsupported date '{value}'")


def _parse_time(value: str) -> time:
    for time_format in TIME_FORMATS:
        try:
            return datetime.strptime(value, time_format).time()
        except ValueError:
            continue
    raise ValueError(f"unsupported time '{value}'")


def parse_schedule_datetime(date_value: str, time_value: str) -> datetime:
    return datetime.combine(_parse_date(date_value), _parse_time(time_value))


def list_schedule_entries(db: Session) -> list[ScheduleEntry]:
    stmt = select(ScheduleEntry).order_by(ScheduleEntry.starts_at, ScheduleEntry.group_name)
    return db.scalars(stmt).all()


def find_schedule_for_time(db: Session, current_time: datetime) -> ScheduleEntry | None:
    stmt = (
        select(ScheduleEntry)
        .where(
            ScheduleEntry.starts_at <= current_time,
            ScheduleEntry.ends_at >= current_time,
        )
        .order_by(ScheduleEntry.starts_at.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


def import_schedule_csv(
    db: Session,
    csv_content: str,
    replace_existing: bool = False,
) -> dict[str, object]:
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    if not reader.fieldnames:
        return {
            "imported_count": 0,
            "created_count": 0,
            "updated_count": 0,
            "skipped_count": 0,
            "errors": ["CSV must include a header row."],
        }

    now = current_time()
    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors: list[str] = []

    if replace_existing:
        db.execute(delete(ScheduleEntry))

    existing_entries = {
        (entry.group_name.casefold(), entry.starts_at, entry.ends_at): entry
        for entry in db.scalars(select(ScheduleEntry)).all()
    }

    for line_number, row in enumerate(reader, start=2):
        date_value = _pick_value(row, "date", "day")
        start_value = _pick_value(row, "start_time", "start", "starts_at")
        end_value = _pick_value(row, "end_time", "end", "ends_at")
        group_name = _pick_value(row, "group_name", "group", "group_id")
        title = _pick_value(row, "title", "lesson", "name") or None

        if not date_value or not start_value or not end_value or not group_name:
            skipped_count += 1
            errors.append(f"Line {line_number}: missing date, start_time, end_time, or group_name.")
            continue

        try:
            starts_at = parse_schedule_datetime(date_value, start_value)
            ends_at = parse_schedule_datetime(date_value, end_value)
        except ValueError as exc:
            skipped_count += 1
            errors.append(f"Line {line_number}: {exc}.")
            continue

        if ends_at <= starts_at:
            skipped_count += 1
            errors.append(f"Line {line_number}: end_time must be after start_time.")
            continue

        key = (group_name.casefold(), starts_at, ends_at)
        existing = existing_entries.get(key)

        if existing is None:
            entry = ScheduleEntry(
                title=title,
                group_name=group_name,
                starts_at=starts_at,
                ends_at=ends_at,
                created_at=now,
                updated_at=now,
            )
            db.add(entry)
            existing_entries[key] = entry
            created_count += 1
            continue

        existing.title = title
        existing.group_name = group_name
        existing.updated_at = now
        updated_count += 1

    db.commit()

    return {
        "imported_count": created_count + updated_count,
        "created_count": created_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "errors": errors,
    }
