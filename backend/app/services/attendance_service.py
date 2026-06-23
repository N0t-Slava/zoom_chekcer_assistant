import csv
import io
import logging
import re
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from ..models import AttendanceRecord, AttendanceStatus, Meeting, ScheduleEntry, Student
from .report_service import refresh_attendance_summary_for_schedule
from .schedule_service import find_schedule_for_time
from .student_service import (
    aliases_by_student_id,
    build_roster_name_keys,
    build_student_name_keys,
    canonical_name_key,
    normalize_student_name,
    participant_matches_roster,
)
from .time_service import app_now


logger = logging.getLogger(__name__)

WHITESPACE_RE = re.compile(r"\s+")
ACTIVE_TIMEOUT_SECONDS = 30


def normalize_participant_names(participants: list[str]) -> list[str]:
    normalized: list[str] = []
    seen_keys: set[str] = set()

    for raw_name in participants:
        collapsed = WHITESPACE_RE.sub(" ", raw_name).strip()
        if not collapsed:
            continue

        dedupe_key = collapsed.casefold()
        if dedupe_key in seen_keys:
            continue

        normalized.append(collapsed)
        seen_keys.add(dedupe_key)

    return normalized


def current_time() -> datetime:
    return app_now()


def _duration_seconds(first_seen: datetime, current_time: datetime) -> int:
    if first_seen.tzinfo is None and current_time.tzinfo is not None:
        current_time = current_time.replace(tzinfo=None)
    elif first_seen.tzinfo is not None and current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)

    return max(0, int((current_time - first_seen).total_seconds()))


def _active_records_query(meeting_session_id: int) -> Select[tuple[AttendanceRecord]]:
    return select(AttendanceRecord).where(
        AttendanceRecord.meeting_session_id == meeting_session_id,
        AttendanceRecord.status == AttendanceStatus.ACTIVE.value,
    )


def _participant_keys(participant_name: str) -> set[str]:
    return {
        key
        for key in {
            normalize_student_name(participant_name),
            canonical_name_key(participant_name),
        }
        if key
    }


def _student_identity_lookup(
    students: list[Student],
    student_aliases: dict[int, list[str]],
) -> dict[str, int | None]:
    identity_by_key: dict[str, int | None] = {}
    for student in students:
        for key in build_student_name_keys(student, student_aliases.get(student.id)):
            existing = identity_by_key.get(key)
            if existing is None and key in identity_by_key:
                continue
            if existing is not None and existing != student.id:
                identity_by_key[key] = None
                continue
            identity_by_key[key] = student.id
    return identity_by_key


def _participant_identity_key(
    participant_name: str,
    identity_by_key: dict[str, int | None] | None = None,
) -> str:
    for key in _participant_keys(participant_name):
        student_id = (identity_by_key or {}).get(key)
        if student_id is not None:
            return f"student:{student_id}"
    return f"name:{canonical_name_key(participant_name) or normalize_student_name(participant_name)}"


def _merge_duplicate_records(
    db: Session,
    meeting_session_id: int,
    identity_by_key: dict[str, int | None] | None = None,
) -> bool:
    records = db.scalars(
        select(AttendanceRecord)
        .where(AttendanceRecord.meeting_session_id == meeting_session_id)
        .order_by(
            AttendanceRecord.participant_name,
            AttendanceRecord.first_seen,
            AttendanceRecord.id,
        )
    ).all()
    by_name: dict[str, AttendanceRecord] = {}
    deleted_any = False

    for record in records:
        key = _participant_identity_key(record.participant_name, identity_by_key)
        existing = by_name.get(key)
        if existing is None:
            by_name[key] = record
            continue

        existing.first_seen = min(existing.first_seen, record.first_seen)
        existing.last_seen = max(existing.last_seen, record.last_seen)
        existing.total_seconds = max(
            existing.total_seconds,
            _duration_seconds(existing.first_seen, existing.last_seen),
        )
        if record.status == AttendanceStatus.ACTIVE.value:
            existing.status = AttendanceStatus.ACTIVE.value
            existing.last_seen = max(existing.last_seen, record.last_seen)
        db.delete(record)
        deleted_any = True

    if deleted_any:
        db.flush()
    return deleted_any


def merge_duplicate_attendance_records(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> bool:
    stmt = select(AttendanceRecord.meeting_session_id).where(
        AttendanceRecord.meeting_session_id.is_not(None)
    )
    if meeting_session_id:
        stmt = stmt.where(AttendanceRecord.meeting_session_id == meeting_session_id)
    if meeting_id:
        stmt = stmt.where(AttendanceRecord.meeting_id == meeting_id)

    session_ids = [session_id for session_id in db.scalars(stmt.distinct()).all() if session_id]
    merged_any = False
    for session_id in session_ids:
        meeting = db.get(Meeting, session_id)
        identity_by_key = None
        if meeting and meeting.group_name:
            students = db.scalars(select(Student).where(Student.group_name == meeting.group_name)).all()
            student_aliases = aliases_by_student_id(db, [student.id for student in students])
            identity_by_key = _student_identity_lookup(students, student_aliases)
        merged_any = _merge_duplicate_records(db, session_id, identity_by_key) or merged_any

    if merged_any:
        db.commit()
    return merged_any


def expire_stale_active_records(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> None:
    cutoff = current_time() - timedelta(seconds=ACTIVE_TIMEOUT_SECONDS)
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.status == AttendanceStatus.ACTIVE.value,
        AttendanceRecord.last_seen < cutoff,
    )
    if meeting_session_id:
        stmt = stmt.where(AttendanceRecord.meeting_session_id == meeting_session_id)
    if meeting_id:
        stmt = stmt.where(AttendanceRecord.meeting_id == meeting_id)

    stale_records = db.scalars(stmt).all()
    if not stale_records:
        return

    for record in stale_records:
        record.total_seconds = _duration_seconds(record.first_seen, record.last_seen)
        record.status = AttendanceStatus.LEFT.value

    db.commit()


def get_or_create_current_meeting(db: Session, zoom_meeting_id: str, now: datetime) -> Meeting:
    latest_meeting = db.scalars(
        select(Meeting)
        .where(Meeting.zoom_meeting_id == zoom_meeting_id)
        .order_by(Meeting.started_at.desc())
        .limit(1)
    ).first()

    if (
        latest_meeting
        and latest_meeting.ended_at is None
        and latest_meeting.started_at.date() == now.date()
    ):
        if latest_meeting.schedule_entry_id is None:
            schedule_entry = find_schedule_for_time(db, now)
            if schedule_entry:
                latest_meeting.schedule_entry_id = schedule_entry.id
                latest_meeting.title = schedule_entry.title
                latest_meeting.group_name = schedule_entry.group_name
                db.flush()
        return latest_meeting

    schedule_entry = find_schedule_for_time(db, now)
    meeting = Meeting(
        zoom_meeting_id=zoom_meeting_id,
        schedule_entry_id=schedule_entry.id if schedule_entry else None,
        title=schedule_entry.title if schedule_entry else None,
        group_name=schedule_entry.group_name if schedule_entry else None,
        started_at=now,
        created_at=now,
    )
    db.add(meeting)
    db.flush()
    return meeting


def process_attendance_update(
    db: Session,
    meeting_id: str,
    participants: list[str],
    owner_present: bool = False,
) -> dict[str, object]:
    now = current_time()
    meeting = get_or_create_current_meeting(db, meeting_id, now)
    if owner_present and meeting.owner_joined_at is None:
        meeting.owner_joined_at = now
    expire_stale_active_records(db, meeting_session_id=meeting.id)
    participant_names = normalize_participant_names(participants)
    schedule_entry = db.get(ScheduleEntry, meeting.schedule_entry_id) if meeting.schedule_entry_id else None
    roster_students = (
        db.scalars(select(Student).where(Student.group_name == schedule_entry.group_name)).all()
        if schedule_entry
        else []
    )
    student_aliases = aliases_by_student_id(db, [student.id for student in roster_students])
    identity_by_key = _student_identity_lookup(roster_students, student_aliases)

    legacy_active_records = db.scalars(
        select(AttendanceRecord).where(
            AttendanceRecord.meeting_id == meeting_id,
            AttendanceRecord.meeting_session_id.is_(None),
        )
    ).all()
    for record in legacy_active_records:
        record.meeting_session_id = meeting.id

    db.flush()
    _merge_duplicate_records(db, meeting.id, identity_by_key)
    session_records = db.scalars(
        select(AttendanceRecord)
        .where(AttendanceRecord.meeting_session_id == meeting.id)
        .order_by(AttendanceRecord.last_seen.desc(), AttendanceRecord.id.desc())
    ).all()

    records_by_name: dict[str, AttendanceRecord] = {}
    for record in session_records:
        records_by_name.setdefault(_participant_identity_key(record.participant_name, identity_by_key), record)

    incoming_by_name: dict[str, str] = {}
    for name in participant_names:
        incoming_by_name.setdefault(_participant_identity_key(name, identity_by_key), name)
    joined: list[str] = []
    left: list[str] = []
    unmatched_participants: list[str] = []

    for key, participant_name in incoming_by_name.items():
        existing = records_by_name.get(key)
        if existing is None:
            db.add(
                AttendanceRecord(
                    participant_name=participant_name,
                    meeting_id=meeting_id,
                    meeting_session_id=meeting.id,
                    first_seen=now,
                    last_seen=now,
                    total_seconds=0,
                    status=AttendanceStatus.ACTIVE.value,
                )
            )
            joined.append(participant_name)
            continue

        if existing.status != AttendanceStatus.ACTIVE.value:
            joined.append(existing.participant_name)
        existing.status = AttendanceStatus.ACTIVE.value
        existing.participant_name = participant_name
        existing.last_seen = now
        existing.total_seconds = _duration_seconds(existing.first_seen, now)

    for key, record in records_by_name.items():
        if key in incoming_by_name:
            continue
        if record.status != AttendanceStatus.ACTIVE.value:
            continue

        record.last_seen = now
        record.total_seconds = _duration_seconds(record.first_seen, now)
        record.status = AttendanceStatus.LEFT.value
        left.append(record.participant_name)

    if schedule_entry:
        refresh_attendance_summary_for_schedule(db, schedule_entry, now)
        roster_keys = build_roster_name_keys(roster_students, student_aliases)
        unmatched_participants = [
            name for name in participant_names if not participant_matches_roster(name, roster_keys)
        ]

    db.commit()

    log_method = logger.info if joined or left else logger.debug
    log_method(
        "Processed attendance update for meeting '%s': session=%s active=%s joined=%s left=%s",
        meeting_id,
        meeting.id,
        len(incoming_by_name),
        joined,
        left,
    )

    return {
        "meeting_id": meeting_id,
        "meeting_session_id": meeting.id,
        "meeting_title": meeting.title,
        "meeting_group_name": meeting.group_name,
        "schedule_entry_id": meeting.schedule_entry_id,
        "owner_joined": meeting.owner_joined_at is not None,
        "active_count": len(incoming_by_name),
        "joined": joined,
        "left": left,
        "unmatched_participants": unmatched_participants,
    }


def list_current_attendance(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> list[AttendanceRecord]:
    expire_stale_active_records(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)
    merge_duplicate_attendance_records(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)

    stmt = select(AttendanceRecord).where(
        AttendanceRecord.status == AttendanceStatus.ACTIVE.value
    )
    if meeting_session_id:
        stmt = stmt.where(AttendanceRecord.meeting_session_id == meeting_session_id)
    if meeting_id:
        stmt = stmt.where(AttendanceRecord.meeting_id == meeting_id)

    stmt = stmt.order_by(AttendanceRecord.meeting_session_id, AttendanceRecord.meeting_id, AttendanceRecord.participant_name)
    return db.scalars(stmt).all()


def list_unmatched_current_participants(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> list[dict[str, object]]:
    records = list_current_attendance(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)
    if not records:
        return []

    meeting_ids = {record.meeting_session_id for record in records if record.meeting_session_id}
    meetings = {
        meeting.id: meeting
        for meeting in db.scalars(select(Meeting).where(Meeting.id.in_(meeting_ids))).all()
    }

    group_names = {meeting.group_name for meeting in meetings.values() if meeting.group_name}
    students_by_group = {
        group.casefold(): db.scalars(select(Student).where(Student.group_name == group)).all()
        for group in group_names
    }
    aliases_by_group = {
        group_key: aliases_by_student_id(db, [student.id for student in students])
        for group_key, students in students_by_group.items()
    }

    unmatched: list[dict[str, object]] = []
    for record in records:
        meeting = meetings.get(record.meeting_session_id)
        if not meeting or not meeting.group_name:
            continue

        group_key = meeting.group_name.casefold()
        roster_keys = build_roster_name_keys(
            students_by_group.get(group_key, []),
            aliases_by_group.get(group_key),
        )
        if participant_matches_roster(record.participant_name, roster_keys):
            continue

        unmatched.append(
            {
                "participant_name": record.participant_name,
                "meeting_id": record.meeting_id,
                "meeting_session_id": record.meeting_session_id,
                "group_name": meeting.group_name,
                "first_seen": record.first_seen,
                "last_seen": record.last_seen,
            }
        )

    return unmatched


def list_attendance_history(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
    limit: int | None = None,
) -> list[AttendanceRecord]:
    expire_stale_active_records(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)
    merge_duplicate_attendance_records(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)

    stmt = select(AttendanceRecord)
    if meeting_session_id:
        stmt = stmt.where(AttendanceRecord.meeting_session_id == meeting_session_id)
    if meeting_id:
        stmt = stmt.where(AttendanceRecord.meeting_id == meeting_id)

    stmt = stmt.order_by(
        AttendanceRecord.meeting_session_id,
        AttendanceRecord.meeting_id,
        AttendanceRecord.first_seen.desc(),
        AttendanceRecord.participant_name,
    )
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()


def export_attendance_csv(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> str:
    rows = list_attendance_history(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "participant_name",
            "meeting_id",
            "meeting_session_id",
            "first_seen",
            "last_seen",
            "total_seconds",
            "status",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                row.id,
                row.participant_name,
                row.meeting_id,
                row.meeting_session_id,
                row.first_seen.isoformat(),
                row.last_seen.isoformat(),
                row.total_seconds,
                row.status,
            ]
        )

    return buffer.getvalue()


def list_meetings(db: Session) -> list[Meeting]:
    stmt = select(Meeting).order_by(Meeting.started_at.desc(), Meeting.id.desc())
    return db.scalars(stmt).all()


def get_meeting(db: Session, meeting_session_id: int) -> Meeting | None:
    return db.get(Meeting, meeting_session_id)


def update_meeting(
    db: Session,
    meeting: Meeting,
    title: str | None,
    group_name: str | None,
) -> Meeting:
    meeting.title = title or None
    meeting.group_name = group_name or None
    db.commit()
    db.refresh(meeting)
    return meeting


def close_meeting(db: Session, meeting: Meeting) -> Meeting:
    now = current_time()
    meeting.ended_at = now

    active_records = db.scalars(_active_records_query(meeting.id)).all()
    for record in active_records:
        record.last_seen = now
        record.total_seconds = _duration_seconds(record.first_seen, now)
        record.status = AttendanceStatus.LEFT.value

    if meeting.schedule_entry_id:
        schedule_entry = db.get(ScheduleEntry, meeting.schedule_entry_id)
        if schedule_entry:
            refresh_attendance_summary_for_schedule(db, schedule_entry, now)

    db.commit()
    db.refresh(meeting)
    return meeting
