import json
import logging
from dataclasses import dataclass
from datetime import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AttendanceSummary, GoogleSheetSource, ScheduleEntry
from .google_sheets_service import read_sheet_values, update_sheet_values, utcnow_naive
from .student_service import canonical_name_key, normalize_student_name
from .table_import_service import clean_cell


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SheetWriteBackResult:
    source_id: int
    source_name: str
    updated_cells: int = 0
    updated_rows: int = 0
    updated_columns: int = 0
    status: str = "success"
    error: str | None = None


def write_attendance_summaries_to_student_sheets(
    db: Session,
    *,
    owner_key: str | None,
) -> list[SheetWriteBackResult]:
    sources = db.scalars(
        select(GoogleSheetSource)
        .where(
            GoogleSheetSource.session_id == owner_key,
            GoogleSheetSource.import_kind == "students",
        )
        .order_by(GoogleSheetSource.updated_at.desc())
    ).all()
    if not sources:
        return []

    summaries = db.scalars(
        select(AttendanceSummary).order_by(
            AttendanceSummary.lesson_starts_at,
            AttendanceSummary.group_name,
            AttendanceSummary.student_name,
        )
    ).all()

    schedule_entries = db.scalars(
        select(ScheduleEntry).order_by(ScheduleEntry.starts_at, ScheduleEntry.group_name)
    ).all()
    if not schedule_entries:
        return []
    labels_by_entry_id = _schedule_labels(schedule_entries)

    results: list[SheetWriteBackResult] = []
    for source in sources:
        try:
            results.append(_write_source(source, summaries, labels_by_entry_id))
            source.last_synced_at = utcnow_naive()
            source.updated_at = source.last_synced_at
            db.add(source)
        except Exception as exc:
            logger.exception("Unable to write attendance summaries to Google Sheet source %s", source.id)
            results.append(
                SheetWriteBackResult(
                    source_id=source.id,
                    source_name=source.sheet_url,
                    status="failed",
                    error=str(exc),
                )
            )

    db.commit()
    return results


def write_attendance_summaries_to_student_sheet_source(
    db: Session,
    *,
    source: GoogleSheetSource,
) -> SheetWriteBackResult | None:
    summaries = db.scalars(
        select(AttendanceSummary).order_by(
            AttendanceSummary.lesson_starts_at,
            AttendanceSummary.group_name,
            AttendanceSummary.student_name,
        )
    ).all()

    schedule_entries = db.scalars(
        select(ScheduleEntry).order_by(ScheduleEntry.starts_at, ScheduleEntry.group_name)
    ).all()
    if not schedule_entries:
        return None
    labels_by_entry_id = _schedule_labels(schedule_entries)

    result = _write_source(source, summaries, labels_by_entry_id)
    source.last_synced_at = utcnow_naive()
    source.updated_at = source.last_synced_at
    db.add(source)
    db.commit()
    return result


def _write_source(
    source: GoogleSheetSource,
    summaries: list[AttendanceSummary],
    labels_by_entry_id: dict[int, str],
) -> SheetWriteBackResult:
    mapping = json.loads(source.mapping_json)
    if not isinstance(mapping, dict):
        raise ValueError("Saved student sheet mapping is malformed.")

    name_header = str(mapping.get("full_name") or "")
    group_header = str(mapping.get("group_name") or "")
    if not name_header or not group_header:
        raise ValueError("Student sheet mapping must include student name and group columns.")

    values = read_sheet_values(source.sheet_id, source.selected_tab)
    if not values:
        raise ValueError("Student sheet is empty.")

    matrix = [list(row) for row in values]
    headers = [clean_cell(value) for value in matrix[0]]
    name_index = _header_index(headers, name_header)
    group_index = _header_index(headers, group_header)
    if name_index is None or group_index is None:
        raise ValueError("Student sheet headers no longer match the saved mapping.")

    labels = list(labels_by_entry_id.items())
    if not labels:
        return SheetWriteBackResult(source_id=source.id, source_name=source.sheet_url)

    existing_width = max(len(row) for row in matrix)
    header_row = matrix[0]
    _pad_row(header_row, existing_width)
    column_by_label = _ensure_columns(header_row, labels)
    max_columns = max(len(header_row), existing_width)
    status_by_student = _status_by_student(summaries)

    updated_cells = 0
    updated_rows: set[int] = set()
    for row_index, row in enumerate(matrix[1:], start=1):
        _pad_row(row, max_columns)
        student_name = clean_cell(row[name_index] if name_index < len(row) else "")
        group_name = clean_cell(row[group_index] if group_index < len(row) else "")
        if not student_name or not group_name:
            continue

        statuses = status_by_student.get(_student_key(student_name, group_name), {})
        if not statuses:
            continue

        for schedule_entry_id, label in labels:
            status = statuses.get(schedule_entry_id, "")
            column_index = column_by_label[label]
            if row[column_index] == status:
                continue
            row[column_index] = status
            updated_cells += 1
            updated_rows.add(row_index)

    matrix[0] = header_row
    _pad_matrix(matrix, max_columns)
    if updated_cells == 0:
        return SheetWriteBackResult(
            source_id=source.id,
            source_name=source.sheet_url,
            updated_columns=len(labels),
        )

    end_range = f"A1:{_column_name(max_columns)}{len(matrix)}"
    update_sheet_values(source.sheet_id, source.selected_tab, end_range, matrix)
    return SheetWriteBackResult(
        source_id=source.id,
        source_name=source.sheet_url,
        updated_cells=updated_cells,
        updated_rows=len(updated_rows),
        updated_columns=len(labels),
    )


def _schedule_labels(entries: list[ScheduleEntry]) -> dict[int, str]:
    base_counts: dict[str, int] = {}
    labels: dict[int, str] = {}
    for entry in entries:
        if _is_matrix_all_day_entry(entry):
            labels[entry.id] = f"{entry.starts_at:%d.%m}"
            continue

        base = f"{entry.starts_at:%Y-%m-%d %H:%M} {entry.group_name}"
        if entry.title:
            base = f"{base} {entry.title}"
        count = base_counts.get(base, 0) + 1
        base_counts[base] = count
        labels[entry.id] = base if count == 1 else f"{base} #{count}"
    return labels


def _is_matrix_all_day_entry(entry: ScheduleEntry) -> bool:
    return (
        entry.title is None
        and entry.starts_at.time() == time.min
        and entry.ends_at.time() == time(hour=23, minute=59, second=59)
    )


def _status_by_student(summaries: list[AttendanceSummary]) -> dict[tuple[str, str], dict[int, str]]:
    result: dict[tuple[str, str], dict[int, str]] = {}
    for summary in summaries:
        key = _student_key(summary.student_name, summary.group_name)
        result.setdefault(key, {})[summary.schedule_entry_id] = summary.status
    return result


def _student_key(student_name: str, group_name: str) -> tuple[str, str]:
    return canonical_name_key(student_name) or normalize_student_name(student_name), normalize_student_name(group_name)


def _header_index(headers: list[str], header: str) -> int | None:
    header_key = clean_cell(header).casefold()
    for index, value in enumerate(headers):
        if clean_cell(value).casefold() == header_key:
            return index
    return None


def _ensure_columns(header_row: list[object], labels: list[tuple[int, str]]) -> dict[str, int]:
    column_by_label = {clean_cell(value): index for index, value in enumerate(header_row) if clean_cell(value)}
    for _schedule_entry_id, label in labels:
        if label in column_by_label:
            continue
        column_by_label[label] = len(header_row)
        header_row.append(label)
    return column_by_label


def _pad_matrix(matrix: list[list[object]], width: int) -> None:
    for row in matrix:
        _pad_row(row, width)


def _pad_row(row: list[object], width: int) -> None:
    if len(row) < width:
        row.extend([""] * (width - len(row)))


def _column_name(column_count: int) -> str:
    if column_count < 1:
        return "A"

    index = column_count
    letters = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = f"{chr(65 + remainder)}{letters}"
    return letters
