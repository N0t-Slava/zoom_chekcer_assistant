from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class AttendanceStatus(str, Enum):
    ACTIVE = "active"
    LEFT = "left"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    participant_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    meeting_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    first_seen: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=AttendanceStatus.ACTIVE.value, nullable=False)
