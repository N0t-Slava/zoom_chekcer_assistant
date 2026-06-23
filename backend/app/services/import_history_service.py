import json
import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import ImportRun


logger = logging.getLogger(__name__)


def utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def record_import_run(
    db: Session,
    *,
    owner_key: str | None,
    import_kind: str,
    source_type: str,
    source_name: str | None,
    source_id: int | None,
    row_count: int,
    result: dict[str, object] | None = None,
    status: str = "success",
    errors: list[str] | None = None,
    started_at: datetime | None = None,
) -> ImportRun:
    result = result or {}
    errors = errors if errors is not None else [str(error) for error in result.get("errors", []) if error]
    run_status = status
    if status == "success" and errors:
        run_status = "completed_with_errors"
    run = ImportRun(
        session_id=owner_key,
        import_kind=import_kind,
        source_type=source_type,
        source_name=source_name,
        source_id=source_id,
        status=run_status,
        row_count=row_count,
        imported_count=int(result.get("imported_count") or 0),
        created_count=int(result.get("created_count") or 0),
        updated_count=int(result.get("updated_count") or 0),
        skipped_count=int(result.get("skipped_count") or 0),
        errors_json=json.dumps(errors, ensure_ascii=False),
        started_at=started_at or utcnow_naive(),
        finished_at=utcnow_naive(),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    logger.info(
        "import run recorded id=%s owner=%s kind=%s source_type=%s source_id=%s status=%s rows=%s imported=%s skipped=%s errors=%s",
        run.id,
        owner_key or "",
        import_kind,
        source_type,
        source_id if source_id is not None else "",
        run.status,
        row_count,
        run.imported_count,
        run.skipped_count,
        len(errors),
    )
    return run


def list_import_runs(
    db: Session,
    *,
    owner_key: str | None,
    import_kind: str | None = None,
    limit: int = 50,
) -> list[ImportRun]:
    stmt = select(ImportRun).where(ImportRun.session_id == owner_key)
    if import_kind:
        stmt = stmt.where(ImportRun.import_kind == import_kind)
    stmt = stmt.order_by(ImportRun.started_at.desc()).limit(limit)
    return db.scalars(stmt).all()


def import_run_errors(run: ImportRun) -> list[str]:
    if not run.errors_json:
        return []
    try:
        value = json.loads(run.errors_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item]
