import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    AttendanceRecordResponse,
    AttendanceUpdateRequest,
    AttendanceUpdateResponse,
    UnmatchedParticipantResponse,
)
from ..services.attendance_service import (
    export_attendance_csv,
    list_attendance_history,
    list_current_attendance,
    list_unmatched_current_participants,
    process_attendance_update,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attendance", tags=["attendance"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/update", response_model=AttendanceUpdateResponse)
async def update_attendance(payload: AttendanceUpdateRequest, db: DbSession) -> AttendanceUpdateResponse:
    try:
        summary = process_attendance_update(
            db=db,
            meeting_id=payload.meeting_id,
            participants=payload.participants,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while processing attendance update")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process attendance update.",
        ) from exc

    return AttendanceUpdateResponse(**summary)


@router.get("/current", response_model=list[AttendanceRecordResponse])
async def get_current_attendance(
    db: DbSession,
    meeting_id: str | None = Query(default=None, min_length=1),
    meeting_session_id: int | None = Query(default=None, ge=1),
) -> list[AttendanceRecordResponse]:
    try:
        records = list_current_attendance(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while loading current attendance")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load current attendance.",
        ) from exc

    return [AttendanceRecordResponse.model_validate(record) for record in records]


@router.get("/unmatched", response_model=list[UnmatchedParticipantResponse])
async def get_unmatched_participants(
    db: DbSession,
    meeting_id: str | None = Query(default=None, min_length=1),
    meeting_session_id: int | None = Query(default=None, ge=1),
) -> list[UnmatchedParticipantResponse]:
    try:
        records = list_unmatched_current_participants(
            db,
            meeting_id=meeting_id,
            meeting_session_id=meeting_session_id,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while loading unmatched participants")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load unmatched participants.",
        ) from exc

    return [UnmatchedParticipantResponse(**record) for record in records]


@router.get("/history", response_model=list[AttendanceRecordResponse])
async def get_attendance_history(
    db: DbSession,
    meeting_id: str | None = Query(default=None, min_length=1),
    meeting_session_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=30, ge=1, le=30),
) -> list[AttendanceRecordResponse]:
    try:
        records = list_attendance_history(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id, limit=limit)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while loading attendance history")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load attendance history.",
        ) from exc

    return [AttendanceRecordResponse.model_validate(record) for record in records]


@router.get("/export.csv")
async def export_attendance(
    db: DbSession,
    meeting_id: str | None = Query(default=None, min_length=1),
    meeting_session_id: int | None = Query(default=None, ge=1),
) -> Response:
    try:
        csv_content = export_attendance_csv(db, meeting_id=meeting_id, meeting_session_id=meeting_session_id)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while exporting attendance CSV")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to export attendance CSV.",
        ) from exc

    if meeting_session_id:
        filename = f"meeting-{meeting_session_id}-attendance.csv"
    elif meeting_id:
        filename = f"{meeting_id}-attendance.csv"
    else:
        filename = "attendance.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=csv_content, media_type="text/csv", headers=headers)
