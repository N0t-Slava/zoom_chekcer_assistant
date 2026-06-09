import csv
import io
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import AttendanceRecord, AttendanceSummary, Meeting, ScheduleEntry, Student
from .student_service import normalize_student_name


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


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
        key = normalize_student_name(record.participant_name)
        seen_names.add(key)
        seconds_by_name[key] = seconds_by_name.get(key, 0) + record.total_seconds

    return seconds_by_name, seen_names


def generate_attendance_summaries(db: Session) -> dict[str, int]:
    generated_at = utc_now()
    db.execute(delete(AttendanceSummary))

    generated_count = 0
    present_count = 0
    absent_count = 0

    schedule_entries = db.scalars(
        select(ScheduleEntry).order_by(ScheduleEntry.starts_at, ScheduleEntry.group_name)
    ).all()

    for entry in schedule_entries:
        students = db.scalars(
            select(Student)
            .where(Student.group_name == entry.group_name)
            .order_by(Student.full_name)
        ).all()
        meetings = _meetings_for_schedule(db, entry)
        seconds_by_name, seen_names = _attendance_by_name(db, meetings)
        meeting_session_id = meetings[0].id if len(meetings) == 1 else None

        for student in students:
            total_seconds = seconds_by_name.get(student.normalized_name, 0)
            status = "п" if student.normalized_name in seen_names else "н"
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

    db.commit()
    return {
        "generated_count": generated_count,
        "present_count": present_count,
        "absent_count": absent_count,
    }


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
