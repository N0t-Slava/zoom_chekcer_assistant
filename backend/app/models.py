from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class AttendanceStatus(str, Enum):
    ACTIVE = "active"
    LEFT = "left"


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    zoom_meeting_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    schedule_entry_id: Mapped[int | None] = mapped_column(ForeignKey("schedule_entries.id"), index=True, nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    group_name: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    group_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class ScheduleEntry(Base):
    __tablename__ = "schedule_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    group_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class AttendanceSummary(Base):
    __tablename__ = "attendance_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_entry_id: Mapped[int] = mapped_column(ForeignKey("schedule_entries.id"), index=True, nullable=False)
    meeting_session_id: Mapped[int | None] = mapped_column(ForeignKey("meetings.id"), index=True, nullable=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True, nullable=False)
    student_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    group_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    lesson_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lesson_starts_at: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    lesson_ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    total_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    participant_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    meeting_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    meeting_session_id: Mapped[int | None] = mapped_column(ForeignKey("meetings.id"), index=True, nullable=True)
    first_seen: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=AttendanceStatus.ACTIVE.value, nullable=False)
