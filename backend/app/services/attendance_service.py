import csv
import io
import logging
import re
from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from ..models import AttendanceRecord, AttendanceStatus


logger = logging.getLogger(__name__)

WHITESPACE_RE = re.compile(r"\s+")


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


def _active_records_query(meeting_id: str) -> Select[tuple[AttendanceRecord]]:
    return select(AttendanceRecord).where(
        AttendanceRecord.meeting_id == meeting_id,
        AttendanceRecord.status == AttendanceStatus.ACTIVE.value,
    )


def process_attendance_update(
    db: Session,
    meeting_id: str,
    participants: list[str],
) -> dict[str, object]:
    now = utc_now()
    participant_names = normalize_participant_names(participants)
    active_records = db.scalars(_active_records_query(meeting_id)).all()
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
        "active_count": len(incoming_by_name),
        "joined": joined,
        "left": left,
    }


def list_current_attendance(db: Session, meeting_id: str | None = None) -> list[AttendanceRecord]:
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.status == AttendanceStatus.ACTIVE.value
    )
    if meeting_id:
        stmt = stmt.where(AttendanceRecord.meeting_id == meeting_id)

    stmt = stmt.order_by(AttendanceRecord.meeting_id, AttendanceRecord.participant_name)
    return db.scalars(stmt).all()


def list_attendance_history(db: Session, meeting_id: str | None = None) -> list[AttendanceRecord]:
    stmt = select(AttendanceRecord)
    if meeting_id:
        stmt = stmt.where(AttendanceRecord.meeting_id == meeting_id)

    stmt = stmt.order_by(
        AttendanceRecord.meeting_id,
        AttendanceRecord.first_seen.desc(),
        AttendanceRecord.participant_name,
    )
    return db.scalars(stmt).all()


def export_attendance_csv(db: Session, meeting_id: str | None = None) -> str:
    rows = list_attendance_history(db, meeting_id=meeting_id)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "participant_name",
            "meeting_id",
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
                row.first_seen.isoformat(),
                row.last_seen.isoformat(),
                row.total_seconds,
                row.status,
            ]
        )

    return buffer.getvalue()
