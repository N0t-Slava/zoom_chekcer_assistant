import csv
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    ImportFileRequest,
    ImportPreviewResponse,
    StudentAliasCreateRequest,
    StudentAliasResponse,
    StudentCreateRequest,
    StudentImportRequest,
    StudentImportResponse,
    StudentResponse,
)
from ..services.ai_mapping_service import STUDENT_MAPPING_ALIASES, detect_import_mapping
from ..services.import_history_service import record_import_run
from ..services.import_mapping_store import load_confirmed_mapping, mapping_dict, save_confirmed_mapping
from ..services.learned_column_alias_store import load_learned_aliases, save_learned_aliases
from ..services.student_service import (
    aliases_by_student_id,
    create_student,
    create_student_alias,
    import_students_csv,
    import_students_rows,
    list_students,
)
from ..services.table_import_service import decode_file_content, mapping_missing_columns, parse_table_file, preview_rows
from ..services.teacher_identity import teacher_owner_key


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/students", tags=["students"])
DbSession = Annotated[Session, Depends(get_db)]


def _student_mapping_warnings(mapping: dict[str, str]) -> list[str]:
    warnings = []
    if "full_name" not in mapping:
        warnings.append("Student name column was not detected.")
    if "group_name" not in mapping:
        warnings.append("Group column was not detected.")
    return warnings


@router.get("", response_model=list[StudentResponse])
async def get_students(
    db: DbSession,
    group_name: str | None = Query(default=None, min_length=1),
) -> list[StudentResponse]:
    try:
        students = list_students(db, group_name=group_name)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while loading students")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to load students.",
        ) from exc

    aliases = aliases_by_student_id(db, [student.id for student in students])
    return [
        StudentResponse.model_validate(student).model_copy(update={"aliases": aliases.get(student.id, [])})
        for student in students
    ]


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_roster_student(payload: StudentCreateRequest, db: DbSession) -> StudentResponse:
    try:
        student = create_student(db, full_name=payload.full_name, group_name=payload.group_name)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while creating student")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create student.",
        ) from exc

    return StudentResponse.model_validate(student)


@router.post("/aliases", response_model=StudentAliasResponse)
async def create_alias(payload: StudentAliasCreateRequest, db: DbSession) -> StudentAliasResponse:
    try:
        alias = create_student_alias(
            db=db,
            student_id=payload.student_id,
            alias_name=payload.alias_name,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Database error while creating student alias")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create student alias.",
        ) from exc

    if alias is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found.",
        )

    return StudentAliasResponse.model_validate(alias)


@router.post("/import.csv", response_model=StudentImportResponse)
async def import_students(payload: StudentImportRequest, db: DbSession) -> StudentImportResponse:
    try:
        result = import_students_csv(
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
        logger.exception("Database error while importing students")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to import students.",
        ) from exc

    return StudentImportResponse(**result)


@router.post("/import/preview", response_model=ImportPreviewResponse)
async def preview_students_import(payload: ImportFileRequest, request: Request, db: DbSession) -> ImportPreviewResponse:
    try:
        table = parse_table_file(payload.file_name, decode_file_content(payload.file_content_base64))
    except (ValueError, csv.Error) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    sample_rows = preview_rows(table.rows)
    owner_key = teacher_owner_key(db, request)
    saved_mapping = load_confirmed_mapping(db, session_id=owner_key, import_kind="students", headers=table.headers)
    if saved_mapping is not None:
        suggested_mapping = mapping_dict(saved_mapping)
        warnings = _student_mapping_warnings(suggested_mapping)
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

    learned_aliases = load_learned_aliases(db, session_id=owner_key, import_kind="students")
    detection = detect_import_mapping(table.headers, sample_rows, "students", learned_aliases=learned_aliases)
    suggested_mapping = {field: header for field, header in detection.mapping.items() if field in STUDENT_MAPPING_ALIASES}
    warnings = detection.warnings + _student_mapping_warnings(suggested_mapping)
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


@router.post("/import/commit", response_model=StudentImportResponse)
async def commit_students_import(payload: ImportFileRequest, request: Request, db: DbSession) -> StudentImportResponse:
    try:
        table = parse_table_file(payload.file_name, decode_file_content(payload.file_content_base64))
        missing_columns = mapping_missing_columns(payload.mapping, table.headers)
        if missing_columns:
            raise ValueError(f"Mapping references missing columns: {', '.join(missing_columns)}.")
        result = import_students_rows(
            db=db,
            rows=table.rows,
            mapping=payload.mapping,
            replace_existing=payload.replace_existing,
        )
        owner_key = teacher_owner_key(db, request)
        save_confirmed_mapping(
            db,
            session_id=owner_key,
            import_kind="students",
            file_name=payload.file_name,
            headers=table.headers,
            mapping=payload.mapping,
            table_type=payload.table_type or "students",
            confidence=payload.confidence,
            warnings=payload.warnings,
        )
        save_learned_aliases(
            db,
            session_id=owner_key,
            import_kind="students",
            headers=table.headers,
            mapping=payload.mapping,
        )
        record_import_run(
            db,
            owner_key=owner_key,
            import_kind="students",
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
        logger.exception("Database error while committing students import")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to import students.",
        ) from exc

    return StudentImportResponse(**result)
