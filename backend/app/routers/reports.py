import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import AttendanceSummaryGenerateResponse, AttendanceSummaryResponse
from ..services.report_service import (
    export_attendance_matrix_csv,
    generate_attendance_summaries,
    list_attendance_summaries,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/attendance-summary/generate", response_model=AttendanceSummaryGenerateResponse)
async def generate_attendance_summary(db: DbSession) -> AttendanceSummaryGenerateResponse:
    try:
        result = generate_attendance_summaries(db)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while generating attendance summary")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate attendance summary.",
        ) from exc

    return AttendanceSummaryGenerateResponse(**result)


@router.get("/attendance-summary", response_model=list[AttendanceSummaryResponse])
async def get_attendance_summary(db: DbSession) -> list[AttendanceSummaryResponse]:
    try:
        summaries = list_attendance_summaries(db)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while loading attendance summary")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load attendance summary.",
        ) from exc

    return [AttendanceSummaryResponse.model_validate(summary) for summary in summaries]


@router.get("/attendance-matrix.csv")
async def export_attendance_matrix(db: DbSession) -> Response:
    try:
        csv_content = export_attendance_matrix_csv(db)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while exporting attendance matrix")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to export attendance matrix.",
        ) from exc

    headers = {"Content-Disposition": 'attachment; filename="attendance-matrix.csv"'}
    return Response(content=csv_content, media_type="text/csv", headers=headers)
