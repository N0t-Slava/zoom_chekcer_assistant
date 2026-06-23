import json
from datetime import date, datetime, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import GoogleSheetSource, ScheduleEntry
from .google_sheets_service import read_sheet_table, utcnow_naive
from .google_sheet_writeback_service import write_attendance_summaries_to_student_sheet_source
from .import_history_service import record_import_run
from .schedule_service import import_schedule_rows
from .student_service import import_students_rows
from .table_import_service import mapping_missing_columns


def sync_google_sheet_source_rows(
    db: Session,
    *,
    source: GoogleSheetSource,
    owner_key: str | None,
    replace_existing: bool = False,
    source_type: str = "google_sheets",
) -> dict[str, object]:
    table = read_sheet_table(source.sheet_id, source.selected_tab)
    mapping = json.loads(source.mapping_json)
    if not isinstance(mapping, dict):
        raise ValueError("Saved sheet mapping is malformed.")

    missing_columns = mapping_missing_columns({str(k): str(v) for k, v in mapping.items()}, table.headers)
    if missing_columns:
        message = f"Mapping references missing columns: {', '.join(missing_columns)}."
        record_import_run(
            db,
            owner_key=owner_key,
            import_kind=source.import_kind,
            source_type=source_type,
            source_name=source.sheet_url,
            source_id=source.id,
            row_count=len(table.rows),
            status="failed",
            errors=[message],
        )
        raise ValueError(message)

    if source.import_kind == "students":
        result = import_students_rows(db, table.rows, mapping, replace_existing=replace_existing)
        matrix_schedule_result = sync_schedule_from_student_date_columns(db, table.rows, table.headers, mapping)
        result.update(matrix_schedule_result)
    else:
        result = import_schedule_rows(db, table.rows, mapping, replace_existing=replace_existing)

    source.last_synced_at = utcnow_naive()
    source.updated_at = source.last_synced_at
    db.add(source)
    db.commit()
    db.refresh(source)
    record_import_run(
        db,
        owner_key=owner_key,
        import_kind=source.import_kind,
        source_type=source_type,
        source_name=source.sheet_url,
        source_id=source.id,
        row_count=len(table.rows),
        result=result,
    )
    if source.import_kind == "students":
        try:
            write_back_result = write_attendance_summaries_to_student_sheet_source(
                db,
                source=source,
            )
            if write_back_result is not None:
                result["sheets_written_count"] = 1 if write_back_result.status == "success" else 0
                result["sheets_write_errors"] = (
                    [write_back_result.error]
                    if write_back_result.status == "failed" and write_back_result.error
                    else []
                )
        except Exception as exc:
            result["sheets_written_count"] = 0
            result["sheets_write_errors"] = [str(exc)]
    return result


def sync_schedule_from_student_date_columns(
    db: Session,
    rows: list[dict[str, str]],
    headers: list[str],
    mapping: dict[str, str],
) -> dict[str, object]:
    group_header = str(mapping.get("group_name") or "")
    if not group_header:
        return {"schedule_created_count": 0, "schedule_updated_count": 0}

    mapped_headers = {str(value) for value in mapping.values() if value}
    date_headers = [
        (header, parsed)
        for header in headers
        if header not in mapped_headers
        if (parsed := _parse_matrix_date(header))
    ]
    if not date_headers:
        return {"schedule_created_count": 0, "schedule_updated_count": 0}

    groups = {
        str(row.get(group_header) or "").strip()
        for row in rows
        if str(row.get(group_header) or "").strip()
    }
    if not groups:
        return {"schedule_created_count": 0, "schedule_updated_count": 0}

    existing_entries = {
        (entry.group_name.casefold(), entry.starts_at.date()): entry
        for entry in db.scalars(select(ScheduleEntry)).all()
        if _is_matrix_all_day_entry(entry)
    }
    now = utcnow_naive()
    created_count = 0
    updated_count = 0

    for group_name in groups:
        for _header, entry_date in date_headers:
            starts_at = datetime.combine(entry_date, time.min)
            ends_at = datetime.combine(entry_date, time(hour=23, minute=59, second=59))
            key = (group_name.casefold(), entry_date)
            existing = existing_entries.get(key)
            if existing is None:
                entry = ScheduleEntry(
                    title=None,
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

            if existing.starts_at != starts_at or existing.ends_at != ends_at or existing.group_name != group_name:
                existing.group_name = group_name
                existing.starts_at = starts_at
                existing.ends_at = ends_at
                existing.updated_at = now
                updated_count += 1

    db.commit()
    return {
        "schedule_created_count": created_count,
        "schedule_updated_count": updated_count,
    }


def _parse_matrix_date(value: str) -> date | None:
    cleaned = value.strip()
    if not cleaned:
        return None

    for date_format in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(cleaned, date_format).date()
        except ValueError:
            continue

    current_year = utcnow_naive().year
    for date_format in ("%d.%m", "%d/%m"):
        try:
            parsed = datetime.strptime(cleaned, date_format)
        except ValueError:
            continue
        return date(current_year, parsed.month, parsed.day)
    return None


def _is_matrix_all_day_entry(entry: ScheduleEntry) -> bool:
    return (
        entry.title is None
        and entry.starts_at.time() == time.min
        and entry.ends_at.time() == time(hour=23, minute=59, second=59)
    )
