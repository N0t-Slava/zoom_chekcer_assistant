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
    first_seen: datetime
    last_seen: datetime
    total_seconds: int
    status: str


class AttendanceUpdateResponse(BaseModel):
    meeting_id: str
    active_count: int
    joined: list[str]
    left: list[str]


class HealthResponse(BaseModel):
    status: str
