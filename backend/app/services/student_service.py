import csv
import io
import re
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import Student


WHITESPACE_RE = re.compile(r"\s+")


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def normalize_student_name(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value).strip().casefold()


def _pick_value(row: dict[str, str], *keys: str) -> str:
    normalized_row = {key.strip().casefold(): value for key, value in row.items() if key}
    for key in keys:
        value = normalized_row.get(key)
        if value is not None:
            return WHITESPACE_RE.sub(" ", value).strip()
    return ""


def list_students(db: Session, group_name: str | None = None) -> list[Student]:
    stmt = select(Student)
    if group_name:
        stmt = stmt.where(Student.group_name == group_name)

    stmt = stmt.order_by(Student.group_name, Student.full_name)
    return db.scalars(stmt).all()


def import_students_csv(
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

    now = utc_now()
    created_count = 0
    updated_count = 0
    skipped_count = 0
    errors: list[str] = []

    if replace_existing:
        db.execute(delete(Student))

    existing_students = {
        (student.normalized_name, student.group_name.casefold()): student
        for student in db.scalars(select(Student)).all()
    }

    for line_number, row in enumerate(reader, start=2):
        full_name = _pick_value(row, "full_name", "name", "student", "student_name")
        group_name = _pick_value(row, "group_name", "group", "group_id")

        if not full_name or not group_name:
            skipped_count += 1
            errors.append(f"Line {line_number}: missing full_name/name or group_name/group.")
            continue

        normalized_name = normalize_student_name(full_name)
        key = (normalized_name, group_name.casefold())
        existing = existing_students.get(key)

        if existing is None:
            student = Student(
                full_name=full_name,
                normalized_name=normalized_name,
                group_name=group_name,
                created_at=now,
                updated_at=now,
            )
            db.add(student)
            existing_students[key] = student
            created_count += 1
            continue

        existing.full_name = full_name
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
