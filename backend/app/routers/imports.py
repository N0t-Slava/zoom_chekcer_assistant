from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ImportRunResponse
from ..services.import_history_service import import_run_errors, list_import_runs
from ..services.teacher_identity import teacher_owner_key


router = APIRouter(prefix="/imports", tags=["imports"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/history", response_model=list[ImportRunResponse])
async def import_history(
    request: Request,
    db: DbSession,
    import_kind: str | None = Query(default=None, pattern="^(students|schedule)$"),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[ImportRunResponse]:
    owner_key = teacher_owner_key(db, request)
    runs = list_import_runs(db, owner_key=owner_key, import_kind=import_kind, limit=limit)
    return [
        ImportRunResponse(
            id=run.id,
            import_kind=run.import_kind,
            source_type=run.source_type,
            source_name=run.source_name,
            source_id=run.source_id,
            status=run.status,
            row_count=run.row_count,
            imported_count=run.imported_count,
            created_count=run.created_count,
            updated_count=run.updated_count,
            skipped_count=run.skipped_count,
            errors=import_run_errors(run),
            started_at=run.started_at,
            finished_at=run.finished_at,
        )
        for run in runs
    ]
