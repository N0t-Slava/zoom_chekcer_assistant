import csv
import io
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import AttendanceRecord, AttendanceSummary, Meeting, ScheduleEntry, Student
from .student_service import (
    aliases_by_student_id,
    build_student_name_keys,
    canonical_name_key,
    normalize_student_name,
)
from .time_service import app_now


def current_time() -> datetime:
    return app_now()


def _schedule_label(entry: ScheduleEntry) -> str:
    start = entry.starts_at.strftime("%Y-%m-%d %H:%M")
    group = entry.group_name
    title = f" {entry.title}" if entry.title else ""
    return f"{start} {group}{title}".strip()


def _meetings_for_schedule(db: Session, entry: ScheduleEntry) -> list[Meeting]:
    stmt = select(Meeting).where(
        (Meeting.schedule_entry_id == entry.id)
        | (
            (Meeting.group_name == entry.group_name)
            & (Meeting.started_at >= entry.starts_at)
            & (Meeting.started_at <= entry.ends_at)
        )
    )
    return db.scalars(stmt).all()


def _attendance_by_name(db: Session, meetings: list[Meeting]) -> tuple[dict[str, int], set[str]]:
    meeting_ids = [meeting.id for meeting in meetings]
    if not meeting_ids:
        return {}, set()

    records = db.scalars(
        select(AttendanceRecord).where(AttendanceRecord.meeting_session_id.in_(meeting_ids))
    ).all()
    seconds_by_name: dict[str, int] = {}
    seen_names: set[str] = set()
    for record in records:
        keys = {
            normalize_student_name(record.participant_name),
            canonical_name_key(record.participant_name),
        }
        for key in {key for key in keys if key}:
            seen_names.add(key)
            seconds_by_name[key] = seconds_by_name.get(key, 0) + record.total_seconds

    return seconds_by_name, seen_names


def refresh_attendance_summary_for_schedule(
    db: Session,
    entry: ScheduleEntry,
    generated_at: datetime | None = None,
) -> dict[str, int]:
    generated_at = generated_at or current_time()
    db.execute(delete(AttendanceSummary).where(AttendanceSummary.schedule_entry_id == entry.id))

    generated_count = 0
    present_count = 0
    absent_count = 0

    students = db.scalars(
        select(Student)
        .where(Student.group_name == entry.group_name)
        .order_by(Student.full_name)
    ).all()
    student_aliases = aliases_by_student_id(db, [student.id for student in students])
    meetings = _meetings_for_schedule(db, entry)
    seconds_by_name, seen_names = _attendance_by_name(db, meetings)
    meeting_session_id = meetings[0].id if len(meetings) == 1 else None

    for student in students:
        student_keys = build_student_name_keys(student, student_aliases.get(student.id))
        total_seconds = max((seconds_by_name.get(key, 0) for key in student_keys), default=0)
        status = "п" if student_keys & seen_names else "н"
        if status == "п":
            present_count += 1
        else:
            absent_count += 1

        db.add(
            AttendanceSummary(
                schedule_entry_id=entry.id,
                meeting_session_id=meeting_session_id,
                student_id=student.id,
                student_name=student.full_name,
                group_name=student.group_name,
                lesson_title=entry.title,
                lesson_starts_at=entry.starts_at,
                lesson_ends_at=entry.ends_at,
                status=status,
                total_seconds=total_seconds,
                generated_at=generated_at,
            )
        )
        generated_count += 1

    return {
        "generated_count": generated_count,
        "present_count": present_count,
        "absent_count": absent_count,
    }


def generate_attendance_summaries(db: Session) -> dict[str, int]:
    generated_at = current_time()
    db.execute(delete(AttendanceSummary))

    result = {
        "generated_count": 0,
        "present_count": 0,
        "absent_count": 0,
    }

    schedule_entries = db.scalars(
        select(ScheduleEntry).order_by(ScheduleEntry.starts_at, ScheduleEntry.group_name)
    ).all()

    for entry in schedule_entries:
        entry_result = refresh_attendance_summary_for_schedule(db, entry, generated_at)
        for key in result:
            result[key] += entry_result[key]

    db.commit()
    return result


def list_attendance_summaries(db: Session) -> list[AttendanceSummary]:
    stmt = select(AttendanceSummary).order_by(
        AttendanceSummary.lesson_starts_at,
        AttendanceSummary.group_name,
        AttendanceSummary.student_name,
    )
    return db.scalars(stmt).all()


def export_attendance_matrix_csv(db: Session) -> str:
    summaries = list_attendance_summaries(db)
    schedule_entries = db.scalars(
        select(ScheduleEntry).order_by(ScheduleEntry.starts_at, ScheduleEntry.group_name)
    ).all()

    labels_by_entry_id = {entry.id: _schedule_label(entry) for entry in schedule_entries}
    student_rows: dict[tuple[int, str, str], dict[int, str]] = {}

    for summary in summaries:
        key = (summary.student_id, summary.student_name, summary.group_name)
        student_rows.setdefault(key, {})[summary.schedule_entry_id] = summary.status

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    header = ["student", "group", *labels_by_entry_id.values()]
    writer.writerow(header)

    for (_student_id, student_name, group_name), statuses in sorted(
        student_rows.items(), key=lambda item: (item[0][2], item[0][1])
    ):
        writer.writerow(
            [
                student_name,
                group_name,
                *[statuses.get(entry_id, "") for entry_id in labels_by_entry_id],
            ]
        )

    return buffer.getvalue()
