import csv
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ImportFileRequest, ImportPreviewResponse, ScheduleEntryResponse, ScheduleImportRequest, ScheduleImportResponse
from ..services.schedule_service import import_schedule_csv, import_schedule_rows, list_schedule_entries
from ..services.table_import_service import decode_file_content, parse_table_file, preview_rows, suggest_mapping


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schedule", tags=["schedule"])
DbSession = Annotated[Session, Depends(get_db)]
SCHEDULE_MAPPING_ALIASES = {
    "date": ["date", "day", "lesson_date", "lesson date", "дата"],
    "start_time": ["start_time", "start", "starts_at", "start time", "початок"],
    "end_time": ["end_time", "end", "ends_at", "end time", "кінець", "завершення"],
    "group_name": ["group_name", "group", "group_id", "class", "група", "клас"],
    "title": ["title", "lesson", "name", "topic", "назва", "урок", "тема"],
}


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


@router.post("/import/preview", response_model=ImportPreviewResponse)
async def preview_schedule_import(payload: ImportFileRequest) -> ImportPreviewResponse:
    try:
        table = parse_table_file(payload.file_name, decode_file_content(payload.file_content_base64))
    except (ValueError, csv.Error) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    warnings = []
    suggested_mapping = suggest_mapping(table.headers, SCHEDULE_MAPPING_ALIASES)
    for required_field, label in {
        "date": "Date",
        "start_time": "Start time",
        "end_time": "End time",
        "group_name": "Group",
    }.items():
        if required_field not in suggested_mapping:
            warnings.append(f"{label} column was not detected.")
    return ImportPreviewResponse(
        headers=table.headers,
        suggested_mapping=suggested_mapping,
        sample_rows=preview_rows(table.rows),
        total_rows=len(table.rows),
        warnings=warnings,
    )


@router.post("/import/commit", response_model=ScheduleImportResponse)
async def commit_schedule_import(payload: ImportFileRequest, db: DbSession) -> ScheduleImportResponse:
    try:
        table = parse_table_file(payload.file_name, decode_file_content(payload.file_content_base64))
        result = import_schedule_rows(
            db=db,
            rows=table.rows,
            mapping=payload.mapping,
            replace_existing=payload.replace_existing,
        )
    except (ValueError, csv.Error) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while committing schedule import")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to import schedule.",
        ) from exc

    return ScheduleImportResponse(**result)
