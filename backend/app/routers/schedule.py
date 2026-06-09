import csv
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ScheduleEntryResponse, ScheduleImportRequest, ScheduleImportResponse
from ..services.schedule_service import import_schedule_csv, list_schedule_entries


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schedule", tags=["schedule"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ScheduleEntryResponse])
async def get_schedule(db: DbSession) -> list[ScheduleEntryResponse]:
    try:
        entries = list_schedule_entries(db)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while loading schedule")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load schedule.",
        ) from exc

    return [ScheduleEntryResponse.model_validate(entry) for entry in entries]


@router.post("/import.csv", response_model=ScheduleImportResponse)
async def import_schedule(payload: ScheduleImportRequest, db: DbSession) -> ScheduleImportResponse:
    try:
        result = import_schedule_csv(
            db=db,
            csv_content=payload.csv_content,
            replace_existing=payload.replace_existing,
        )
    except csv.Error as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV: {exc}",
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while importing schedule")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to import schedule.",
        ) from exc

    return ScheduleImportResponse(**result)
