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


class UnmatchedParticipantResponse(BaseModel):
    participant_name: str
    meeting_id: str
    meeting_session_id: int | None = None
    group_name: str | None = None
    first_seen: datetime
    last_seen: datetime


class AttendanceUpdateResponse(BaseModel):
    meeting_id: str
    meeting_session_id: int
    meeting_title: str | None = None
    meeting_group_name: str | None = None
    schedule_entry_id: int | None = None
    active_count: int
    joined: list[str]
    left: list[str]
    unmatched_participants: list[str] = Field(default_factory=list)


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
    aliases: list[str] = Field(default_factory=list)


class StudentCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(..., min_length=1, max_length=255)
    group_name: str = Field(..., min_length=1, max_length=255)


class StudentAliasCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    student_id: int = Field(..., ge=1)
    alias_name: str = Field(..., min_length=1, max_length=255)


class StudentAliasResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    alias_name: str
    normalized_name: str
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


class ZoomSdkConfigResponse(BaseModel):
    configured: bool
    client_id: str | None = None
    sdk_js_url: str | None = None


class ZoomSdkSignatureRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    meeting_number: str = Field(..., min_length=6, max_length=32)
    role: int = Field(default=0, ge=0, le=1)


class ZoomSdkSignatureResponse(BaseModel):
    signature: str
    client_id: str
    meeting_number: str
    role: int
    expires_at: int


class ZoomOAuthStatusResponse(BaseModel):
    authorized: bool
    expires_at: int | None = None
    api_url: str | None = None
    scopes: list[str] = Field(default_factory=list)
    user_id: str | None = None
    account_id: str | None = None
    email: str | None = None
    display_name: str | None = None
    profile_error: str | None = None


class ZoomMeetingCheckResponse(BaseModel):
    meeting_number: str
    can_read: bool
    error: str | None = None
    id: str | None = None
    uuid: str | None = None
    host_id: str | None = None
    host_email: str | None = None
    current_user_id: str | None = None
    current_user_email: str | None = None
    owner_matches_authorized_user: bool | None = None
    topic: str | None = None
    type: int | None = None
    status: str | None = None
    has_password: bool = False
    settings: dict[str, object] = Field(default_factory=dict)


class ZoomSavedMeetingCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    meeting_number: str = Field(..., min_length=6, max_length=32)
    title: str | None = Field(default=None, max_length=255)
    passcode: str | None = Field(default=None, max_length=255)
    join_as_host: bool = True


class ZoomSavedMeetingResponse(BaseModel):
    id: int
    meeting_number: str
    title: str | None = None
    passcode: str | None = None
    join_as_host: bool
    updated_at: datetime


class ZoomZakResponse(BaseModel):
    zak: str


class HealthResponse(BaseModel):
    status: str
