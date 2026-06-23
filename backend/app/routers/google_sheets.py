import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GoogleSheetSource
from ..schemas import (
    GoogleSheetPreviewRequest,
    GoogleSheetPreviewResponse,
    GoogleSheetSourceResponse,
    GoogleSheetSourceSaveRequest,
    GoogleSheetSyncRequest,
    GoogleSheetSyncResponse,
    GoogleSheetTabsRequest,
    GoogleSheetTabsResponse,
    GoogleSheetsConfigResponse,
    ImportPreviewResponse,
)
from ..services.ai_mapping_service import SCHEDULE_MAPPING_ALIASES, STUDENT_MAPPING_ALIASES, detect_import_mapping
from ..services.google_sheet_sync_service import sync_google_sheet_source_rows
from ..services.google_sheets_service import (
    extract_sheet_id,
    is_google_sheets_configured,
    list_sheet_tabs,
    read_sheet_table,
    service_account_email_for_display,
    utcnow_naive,
)
from ..services.import_mapping_store import headers_signature, load_confirmed_mapping, mapping_dict, save_confirmed_mapping
from ..services.learned_column_alias_store import load_learned_aliases, save_learned_aliases
from ..services.teacher_identity import teacher_owner_key
from ..services.table_import_service import mapping_missing_columns, preview_rows


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/google-sheets", tags=["google-sheets"])
DbSession = Annotated[Session, Depends(get_db)]


def _allowed_fields(import_kind: str) -> dict[str, list[str]]:
    return STUDENT_MAPPING_ALIASES if import_kind == "students" else SCHEDULE_MAPPING_ALIASES


def _mapping_warnings(import_kind: str, mapping: dict[str, str]) -> list[str]:
    if import_kind == "students":
        warnings = []
        if "full_name" not in mapping:
            warnings.append("Student name column was not detected.")
        if "group_name" not in mapping:
            warnings.append("Group column was not detected.")
        return warnings

    warnings = []
    for field, label in {
        "date": "Date",
        "start_time": "Start time",
        "end_time": "End time",
        "group_name": "Group",
    }.items():
        if field not in mapping:
            warnings.append(f"{label} column was not detected.")
    return warnings


def _source_response(source: GoogleSheetSource) -> GoogleSheetSourceResponse:
    try:
        mapping = json.loads(source.mapping_json)
    except json.JSONDecodeError:
        mapping = {}
    if not isinstance(mapping, dict):
        mapping = {}
    return GoogleSheetSourceResponse(
        id=source.id,
        import_kind=source.import_kind,
        sheet_id=source.sheet_id,
        sheet_url=source.sheet_url,
        selected_tab=source.selected_tab,
        table_type=source.table_type,
        mapping={str(key): str(value) for key, value in mapping.items() if value},
        confidence=source.confidence_percent / 100,
        auto_sync_enabled=bool(source.auto_sync_enabled),
        updated_at=source.updated_at,
        last_synced_at=source.last_synced_at,
    )


def _google_error(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(exc),
    )


@router.get("/config", response_model=GoogleSheetsConfigResponse)
async def google_sheets_config() -> GoogleSheetsConfigResponse:
    bot_email = service_account_email_for_display()
    return GoogleSheetsConfigResponse(
        configured=is_google_sheets_configured(),
        bot_email=bot_email,
        service_account_email=bot_email,
    )


@router.post("/tabs", response_model=GoogleSheetTabsResponse)
async def google_sheet_tabs(payload: GoogleSheetTabsRequest) -> GoogleSheetTabsResponse:
    try:
        sheet_id = extract_sheet_id(payload.sheet_url)
        tabs = list_sheet_tabs(sheet_id)
    except Exception as exc:
        raise _google_error(exc) from exc
    return GoogleSheetTabsResponse(sheet_id=sheet_id, tabs=tabs)


@router.post("/preview", response_model=GoogleSheetPreviewResponse)
async def google_sheet_preview(
    payload: GoogleSheetPreviewRequest,
    request: Request,
    db: DbSession,
) -> GoogleSheetPreviewResponse:
    try:
        sheet_id = extract_sheet_id(payload.sheet_url)
        table = read_sheet_table(sheet_id, payload.selected_tab, row_limit=25)
    except Exception as exc:
        raise _google_error(exc) from exc

    sample_rows = preview_rows(table.rows)
    owner_key = teacher_owner_key(db, request)
    saved_mapping = load_confirmed_mapping(db, session_id=owner_key, import_kind=payload.import_kind, headers=table.headers)
    if saved_mapping is not None:
        suggested_mapping = mapping_dict(saved_mapping)
        return GoogleSheetPreviewResponse(
            sheet_id=sheet_id,
            selected_tab=payload.selected_tab,
            preview=ImportPreviewResponse(
                headers=table.headers,
                suggested_mapping=suggested_mapping,
                sample_rows=sample_rows,
                total_rows=len(table.rows),
                table_type=saved_mapping.table_type,
                confidence=saved_mapping.confidence_percent / 100,
                mapping_source="saved",
                warnings=_mapping_warnings(payload.import_kind, suggested_mapping),
            ),
        )

    learned_aliases = load_learned_aliases(db, session_id=owner_key, import_kind=payload.import_kind)
    detection = detect_import_mapping(
        table.headers,
        sample_rows,
        payload.import_kind,
        learned_aliases=learned_aliases,
    )
    allowed_fields = _allowed_fields(payload.import_kind)
    suggested_mapping = {field: header for field, header in detection.mapping.items() if field in allowed_fields}
    warnings = detection.warnings + _mapping_warnings(payload.import_kind, suggested_mapping)
    return GoogleSheetPreviewResponse(
        sheet_id=sheet_id,
        selected_tab=payload.selected_tab,
        preview=ImportPreviewResponse(
            headers=table.headers,
            suggested_mapping=suggested_mapping,
            sample_rows=sample_rows,
            total_rows=len(table.rows),
            table_type=detection.table_type,
            confidence=detection.confidence,
            mapping_source=detection.source,
            warnings=warnings,
        ),
    )


@router.get("/sources", response_model=list[GoogleSheetSourceResponse])
async def google_sheet_sources(
    request: Request,
    db: DbSession,
    import_kind: str = Query(default="students", pattern="^(students|schedule)$"),
) -> list[GoogleSheetSourceResponse]:
    owner_key = teacher_owner_key(db, request)
    sources = db.scalars(
        select(GoogleSheetSource)
        .where(
            GoogleSheetSource.session_id == owner_key,
            GoogleSheetSource.import_kind == import_kind,
        )
        .order_by(GoogleSheetSource.updated_at.desc())
    ).all()
    return [_source_response(source) for source in sources]


@router.post("/sources", response_model=GoogleSheetSourceResponse)
async def save_google_sheet_source(
    payload: GoogleSheetSourceSaveRequest,
    request: Request,
    db: DbSession,
) -> GoogleSheetSourceResponse:
    try:
        sheet_id = extract_sheet_id(payload.sheet_url)
    except ValueError as exc:
        raise _google_error(exc) from exc
    missing_columns = mapping_missing_columns(payload.mapping, payload.headers)
    if missing_columns:
        raise _google_error(ValueError(f"Mapping references missing columns: {', '.join(missing_columns)}."))

    now = utcnow_naive()
    owner_key = teacher_owner_key(db, request)
    existing = db.scalars(
        select(GoogleSheetSource)
        .where(
            GoogleSheetSource.session_id == owner_key,
            GoogleSheetSource.import_kind == payload.import_kind,
            GoogleSheetSource.sheet_id == sheet_id,
            GoogleSheetSource.selected_tab == payload.selected_tab,
        )
        .limit(1)
    ).first()
    source = existing or GoogleSheetSource(
        session_id=owner_key,
        import_kind=payload.import_kind,
        sheet_id=sheet_id,
        sheet_url=payload.sheet_url,
        selected_tab=payload.selected_tab,
        headers_signature=headers_signature(payload.headers) if payload.headers else None,
        table_type=payload.table_type or payload.import_kind,
        mapping_json="{}",
        created_at=now,
        updated_at=now,
    )
    source.sheet_url = payload.sheet_url
    source.selected_tab = payload.selected_tab
    source.headers_signature = headers_signature(payload.headers) if payload.headers else None
    source.table_type = payload.table_type or payload.import_kind
    source.mapping_json = json.dumps(payload.mapping, ensure_ascii=False, sort_keys=True)
    source.warnings_json = json.dumps(payload.warnings, ensure_ascii=False)
    source.auto_sync_enabled = 1 if payload.auto_sync_enabled else 0
    confidence = payload.confidence if payload.confidence is not None else 1.0
    source.confidence_percent = int(max(0, min(100, round(confidence * 100))))
    source.updated_at = now
    db.add(source)
    try:
        db.commit()
        db.refresh(source)
        save_confirmed_mapping(
            db,
            session_id=owner_key,
            import_kind=payload.import_kind,
            file_name=payload.sheet_url,
            headers=payload.headers,
            mapping=payload.mapping,
            table_type=source.table_type,
            confidence=payload.confidence,
            warnings=payload.warnings,
        )
        save_learned_aliases(
            db,
            session_id=owner_key,
            import_kind=payload.import_kind,
            headers=payload.headers,
            mapping=payload.mapping,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while saving Google Sheet source")
        raise HTTPException(status_code=500, detail="Unable to save Google Sheet source.") from exc
    return _source_response(source)


@router.post("/sources/{source_id}/sync", response_model=GoogleSheetSyncResponse)
async def sync_google_sheet_source(
    source_id: int,
    payload: GoogleSheetSyncRequest,
    request: Request,
    db: DbSession,
) -> GoogleSheetSyncResponse:
    source = db.get(GoogleSheetSource, source_id)
    owner_key = teacher_owner_key(db, request)
    if source is None or source.session_id != owner_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Google Sheet source not found.")

    try:
        result = sync_google_sheet_source_rows(
            db,
            source=source,
            owner_key=owner_key,
            replace_existing=payload.replace_existing,
        )
    except (ValueError, json.JSONDecodeError) as exc:
        raise _google_error(exc) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while syncing Google Sheet source")
        raise HTTPException(status_code=500, detail="Unable to sync Google Sheet source.") from exc

    return GoogleSheetSyncResponse(source=_source_response(source), result=result)
