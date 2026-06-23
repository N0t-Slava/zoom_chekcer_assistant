import csv
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ImportFileRequest, ImportPreviewResponse, ScheduleEntryResponse, ScheduleImportRequest, ScheduleImportResponse
from ..services.ai_mapping_service import SCHEDULE_MAPPING_ALIASES, detect_import_mapping
from ..services.import_history_service import record_import_run
from ..services.import_mapping_store import load_confirmed_mapping, mapping_dict, save_confirmed_mapping
from ..services.schedule_service import import_schedule_csv, import_schedule_rows, list_schedule_entries
from ..services.table_import_service import decode_file_content, mapping_missing_columns, parse_table_file, preview_rows
from ..services.teacher_identity import teacher_owner_key


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/schedule", tags=["schedule"])
DbSession = Annotated[Session, Depends(get_db)]


def _schedule_mapping_warnings(mapping: dict[str, str]) -> list[str]:
    warnings = []
    for required_field, label in {
        "date": "Date",
        "start_time": "Start time",
        "end_time": "End time",
        "group_name": "Group",
    }.items():
        if required_field not in mapping:
            warnings.append(f"{label} column was not detected.")
    return warnings


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
async def preview_schedule_import(payload: ImportFileRequest, request: Request, db: DbSession) -> ImportPreviewResponse:
    try:
        table = parse_table_file(payload.file_name, decode_file_content(payload.file_content_base64))
    except (ValueError, csv.Error) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    sample_rows = preview_rows(table.rows)
    owner_key = teacher_owner_key(db, request)
    saved_mapping = load_confirmed_mapping(db, session_id=owner_key, import_kind="schedule", headers=table.headers)
    if saved_mapping is not None:
        suggested_mapping = mapping_dict(saved_mapping)
        warnings = _schedule_mapping_warnings(suggested_mapping)
        return ImportPreviewResponse(
            headers=table.headers,
            suggested_mapping=suggested_mapping,
            sample_rows=sample_rows,
            total_rows=len(table.rows),
            table_type=saved_mapping.table_type,
            confidence=saved_mapping.confidence_percent / 100,
            mapping_source="saved",
            warnings=warnings,
        )

    detection = detect_import_mapping(table.headers, sample_rows, "schedule")
    suggested_mapping = {field: header for field, header in detection.mapping.items() if field in SCHEDULE_MAPPING_ALIASES}
    warnings = detection.warnings + _schedule_mapping_warnings(suggested_mapping)
    return ImportPreviewResponse(
        headers=table.headers,
        suggested_mapping=suggested_mapping,
        sample_rows=sample_rows,
        total_rows=len(table.rows),
        table_type=detection.table_type,
        confidence=detection.confidence,
        mapping_source=detection.source,
        warnings=warnings,
    )


@router.post("/import/commit", response_model=ScheduleImportResponse)
async def commit_schedule_import(payload: ImportFileRequest, request: Request, db: DbSession) -> ScheduleImportResponse:
    try:
        table = parse_table_file(payload.file_name, decode_file_content(payload.file_content_base64))
        missing_columns = mapping_missing_columns(payload.mapping, table.headers)
        if missing_columns:
            raise ValueError(f"Mapping references missing columns: {', '.join(missing_columns)}.")
        result = import_schedule_rows(
            db=db,
            rows=table.rows,
            mapping=payload.mapping,
            replace_existing=payload.replace_existing,
        )
        owner_key = teacher_owner_key(db, request)
        save_confirmed_mapping(
            db,
            session_id=owner_key,
            import_kind="schedule",
            file_name=payload.file_name,
            headers=table.headers,
            mapping=payload.mapping,
            table_type=payload.table_type or "schedule",
            confidence=payload.confidence,
            warnings=payload.warnings,
        )
        record_import_run(
            db,
            owner_key=owner_key,
            import_kind="schedule",
            source_type="file",
            source_name=payload.file_name,
            source_id=None,
            row_count=len(table.rows),
            result=result,
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
