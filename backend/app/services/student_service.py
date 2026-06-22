import csv
import io
import re
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import Student, StudentAlias


WHITESPACE_RE = re.compile(r"\s+")
PARENTHETICAL_RE = re.compile(r"\([^)]*\)")
NON_NAME_RE = re.compile(r"[^0-9a-zа-яёіїєґ]+", re.IGNORECASE)


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def normalize_student_name(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value).strip().casefold()


def canonical_name_key(value: str) -> str:
    value = normalize_student_name(value)
    value = PARENTHETICAL_RE.sub(" ", value)
    value = re.sub(r"\b[\w.+-]+@[\w.-]+\.\w+\b", " ", value)
    value = NON_NAME_RE.sub(" ", value)
    tokens = WHITESPACE_RE.sub(" ", value).strip().split()
    return " ".join(sorted(tokens))


def build_student_name_keys(student: Student, aliases: list[str] | None = None) -> set[str]:
    keys = {
        normalize_student_name(student.full_name),
        normalize_student_name(student.normalized_name),
        canonical_name_key(student.full_name),
        canonical_name_key(student.normalized_name),
    }
    for alias in aliases or []:
        keys.add(normalize_student_name(alias))
        keys.add(canonical_name_key(alias))
    return {key for key in keys if key}


def build_roster_name_keys(
    students: list[Student],
    aliases_by_student_id: dict[int, list[str]] | None = None,
) -> set[str]:
    keys: set[str] = set()
    for student in students:
        keys.update(build_student_name_keys(student, (aliases_by_student_id or {}).get(student.id)))
    return keys


def participant_matches_roster(participant_name: str, roster_keys: set[str]) -> bool:
    participant_keys = {
        normalize_student_name(participant_name),
        canonical_name_key(participant_name),
    }
    return bool({key for key in participant_keys if key} & roster_keys)


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


def create_student(db: Session, full_name: str, group_name: str) -> Student:
    now = utc_now()
    normalized_name = normalize_student_name(full_name)
    existing = db.scalars(
        select(Student).where(
            Student.normalized_name == normalized_name,
            Student.group_name == group_name,
        )
    ).first()
    if existing:
        existing.full_name = full_name
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return existing

    student = Student(
        full_name=full_name,
        normalized_name=normalized_name,
        group_name=group_name,
        created_at=now,
        updated_at=now,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def aliases_by_student_id(db: Session, student_ids: list[int]) -> dict[int, list[str]]:
    if not student_ids:
        return {}

    aliases = db.scalars(
        select(StudentAlias).where(StudentAlias.student_id.in_(student_ids))
    ).all()
    result: dict[int, list[str]] = {}
    for alias in aliases:
        result.setdefault(alias.student_id, []).append(alias.alias_name)
    return result


def create_student_alias(db: Session, student_id: int, alias_name: str) -> StudentAlias | None:
    student = db.get(Student, student_id)
    if not student:
        return None

    now = utc_now()
    normalized_name = normalize_student_name(alias_name)
    existing = db.scalars(
        select(StudentAlias).where(
            StudentAlias.student_id == student_id,
            StudentAlias.normalized_name == normalized_name,
        )
    ).first()

    if existing:
        existing.alias_name = alias_name
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return existing

    alias = StudentAlias(
        student_id=student_id,
        alias_name=alias_name,
        normalized_name=normalized_name,
        created_at=now,
        updated_at=now,
    )
    db.add(alias)
    db.commit()
    db.refresh(alias)
    return alias


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
        db.execute(delete(StudentAlias))
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
