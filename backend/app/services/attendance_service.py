import csv
import io
import logging
import re
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from ..models import AttendanceRecord, AttendanceStatus, Meeting
from .schedule_service import find_schedule_for_time


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


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


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


def expire_stale_active_records(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> None:
    cutoff = utc_now() - timedelta(seconds=ACTIVE_TIMEOUT_SECONDS)
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
) -> dict[str, object]:
    now = utc_now()
    meeting = get_or_create_current_meeting(db, meeting_id, now)
    expire_stale_active_records(db, meeting_session_id=meeting.id)
    participant_names = normalize_participant_names(participants)
    active_records = db.scalars(_active_records_query(meeting.id)).all()

    legacy_active_records = db.scalars(
        select(AttendanceRecord).where(
            AttendanceRecord.meeting_id == meeting_id,
            AttendanceRecord.meeting_session_id.is_(None),
            AttendanceRecord.status == AttendanceStatus.ACTIVE.value,
        )
    ).all()
    for record in legacy_active_records:
        record.meeting_session_id = meeting.id

    active_records.extend(legacy_active_records)
    active_by_name = {
        record.participant_name.casefold(): record for record in active_records
    }

    incoming_by_name = {name.casefold(): name for name in participant_names}
    joined: list[str] = []
    left: list[str] = []

    for key, participant_name in incoming_by_name.items():
        existing = active_by_name.get(key)
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

        existing.last_seen = now
        existing.total_seconds = _duration_seconds(existing.first_seen, now)

    for key, record in active_by_name.items():
        if key in incoming_by_name:
            continue

        record.last_seen = now
        record.total_seconds = _duration_seconds(record.first_seen, now)
        record.status = AttendanceStatus.LEFT.value
        left.append(record.participant_name)

    db.commit()

    logger.info(
        "Processed attendance update for meeting '%s': active=%s joined=%s left=%s",
        meeting_id,
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
        "active_count": len(incoming_by_name),
        "joined": joined,
        "left": left,
    }


def list_current_attendance(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> list[AttendanceRecord]:
    expire_stale_active_records(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)

    stmt = select(AttendanceRecord).where(
        AttendanceRecord.status == AttendanceStatus.ACTIVE.value
    )
    if meeting_session_id:
        stmt = stmt.where(AttendanceRecord.meeting_session_id == meeting_session_id)
    if meeting_id:
        stmt = stmt.where(AttendanceRecord.meeting_id == meeting_id)

    stmt = stmt.order_by(AttendanceRecord.meeting_session_id, AttendanceRecord.meeting_id, AttendanceRecord.participant_name)
    return db.scalars(stmt).all()


def list_attendance_history(
    db: Session,
    meeting_id: str | None = None,
    meeting_session_id: int | None = None,
) -> list[AttendanceRecord]:
    expire_stale_active_records(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)

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
    now = utc_now()
    meeting.ended_at = now

    active_records = db.scalars(_active_records_query(meeting.id)).all()
    for record in active_records:
        record.last_seen = now
        record.total_seconds = _duration_seconds(record.first_seen, now)
        record.status = AttendanceStatus.LEFT.value

    db.commit()
    db.refresh(meeting)
    return meeting
