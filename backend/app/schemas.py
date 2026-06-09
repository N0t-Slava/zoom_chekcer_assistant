from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AttendanceUpdateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    meeting_id: str = Field(..., min_length=1, max_length=255)
    participants: list[str] = Field(default_factory=list)


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    participant_name: str
    meeting_id: str
    meeting_session_id: int | None = None
    first_seen: datetime
    last_seen: datetime
    total_seconds: int
    status: str


class AttendanceUpdateResponse(BaseModel):
    meeting_id: str
    meeting_session_id: int
    active_count: int
    joined: list[str]
    left: list[str]


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    zoom_meeting_id: str
    schedule_entry_id: int | None = None
    title: str | None = None
    group_name: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    created_at: datetime


class MeetingUpdateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str | None = Field(default=None, max_length=255)
    group_name: str | None = Field(default=None, max_length=255)


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    normalized_name: str
    group_name: str
    created_at: datetime
    updated_at: datetime


class StudentImportRequest(BaseModel):
    csv_content: str = Field(..., min_length=1)
    replace_existing: bool = False


class StudentImportResponse(BaseModel):
    imported_count: int
    created_count: int
    updated_count: int
    skipped_count: int
    errors: list[str]


class ScheduleEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str | None = None
    group_name: str
    starts_at: datetime
    ends_at: datetime
    created_at: datetime
    updated_at: datetime


class ScheduleImportRequest(BaseModel):
    csv_content: str = Field(..., min_length=1)
    replace_existing: bool = False


class ScheduleImportResponse(BaseModel):
    imported_count: int
    created_count: int
    updated_count: int
    skipped_count: int
    errors: list[str]


class AttendanceSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    schedule_entry_id: int
    meeting_session_id: int | None = None
    student_id: int
    student_name: str
    group_name: str
    lesson_title: str | None = None
    lesson_starts_at: datetime
    lesson_ends_at: datetime
    status: str
    total_seconds: int
    generated_at: datetime


class AttendanceSummaryGenerateResponse(BaseModel):
    generated_count: int
    present_count: int
    absent_count: int


class HealthResponse(BaseModel):
    status: str
