import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import MeetingResponse, MeetingUpdateRequest
from ..services.attendance_service import close_meeting, get_meeting, list_meetings, update_meeting


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meetings", tags=["meetings"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[MeetingResponse])
async def get_meetings(db: DbSession) -> list[MeetingResponse]:
    try:
        meetings = list_meetings(db)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while loading meetings")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load meetings.",
        ) from exc

    return [MeetingResponse.model_validate(meeting) for meeting in meetings]


@router.patch("/{meeting_session_id}", response_model=MeetingResponse)
async def patch_meeting(
    meeting_session_id: int,
    payload: MeetingUpdateRequest,
    db: DbSession,
) -> MeetingResponse:
    meeting = get_meeting(db, meeting_session_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found.")

    try:
        updated = update_meeting(
            db=db,
            meeting=meeting,
            title=payload.title,
            group_name=payload.group_name,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while updating meeting")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update meeting.",
        ) from exc

    return MeetingResponse.model_validate(updated)


@router.post("/{meeting_session_id}/close", response_model=MeetingResponse)
async def close_meeting_session(meeting_session_id: int, db: DbSession) -> MeetingResponse:
    meeting = get_meeting(db, meeting_session_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found.")

    try:
        closed = close_meeting(db, meeting)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while closing meeting")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to close meeting.",
        ) from exc

    return MeetingResponse.model_validate(closed)
