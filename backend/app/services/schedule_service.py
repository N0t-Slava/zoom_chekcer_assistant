import csv
import io
import re
from datetime import date, datetime, time, timedelta

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
    try:
        numeric_value = float(value)
        if numeric_value > 1:
            return (datetime(1899, 12, 30) + timedelta(days=int(numeric_value))).date()
    except ValueError:
        pass
    for date_format in DATE_FORMATS:
        try:
            return datetime.strptime(value, date_format).date()
        except ValueError:
            continue
    raise ValueError(f"unsupported date '{value}'")


def _parse_time(value: str) -> time:
    try:
        numeric_value = float(value)
        if 0 <= numeric_value < 1:
            total_seconds = round(numeric_value * 24 * 60 * 60)
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            return time(hour=hours % 24, minute=minutes, second=seconds)
    except ValueError:
        pass
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

    rows = [{header: value for header, value in row.items() if header} for row in reader]
    return import_schedule_rows(
        db=db,
        rows=rows,
        mapping={
            "date": "date",
            "start_time": "start_time",
            "end_time": "end_time",
            "group_name": "group_name",
            "title": "title",
        },
        replace_existing=replace_existing,
        fallback_keys=True,
    )


def import_schedule_rows(
    db: Session,
    rows: list[dict[str, str]],
    mapping: dict[str, str],
    replace_existing: bool = False,
    fallback_keys: bool = False,
) -> dict[str, object]:
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

    def mapped_value(row: dict[str, str], field: str, *fallbacks: str) -> str:
        column = mapping.get(field)
        if column and column in row:
            return clean_value(row.get(column))
        return _pick_value(row, *fallbacks) if fallback_keys else ""

    for line_number, row in enumerate(rows, start=2):
        date_value = mapped_value(row, "date", "date", "day")
        start_value = mapped_value(row, "start_time", "start_time", "start", "starts_at")
        end_value = mapped_value(row, "end_time", "end_time", "end", "ends_at")
        group_name = mapped_value(row, "group_name", "group_name", "group", "group_id")
        title = mapped_value(row, "title", "title", "lesson", "name") or None

        if not date_value or not start_value or not end_value or not group_name:
            skipped_count += 1
            errors.append(f"Line {line_number}: missing date, start time, end time, or group.")
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
            errors.append(f"Line {line_number}: end time must be after start time.")
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
