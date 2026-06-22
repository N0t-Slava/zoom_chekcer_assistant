import csv
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    StudentAliasCreateRequest,
    StudentAliasResponse,
    StudentCreateRequest,
    StudentImportRequest,
    StudentImportResponse,
    StudentResponse,
)
from ..services.student_service import aliases_by_student_id, create_student, create_student_alias, import_students_csv, list_students


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/students", tags=["students"])
DbSession = Annotated[Session, Depends(get_db)]


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
