import json

from sqlalchemy.orm import Session

from ..models import GoogleSheetSource
from .google_sheets_service import read_sheet_table, utcnow_naive
from .import_history_service import record_import_run
from .import_mapping_store import headers_signature
from .schedule_service import import_schedule_rows
from .student_service import import_students_rows
from .table_import_service import mapping_missing_columns


def sync_google_sheet_source_rows(
    db: Session,
    *,
    source: GoogleSheetSource,
    owner_key: str | None,
    replace_existing: bool = False,
    source_type: str = "google_sheets",
) -> dict[str, object]:
    table = read_sheet_table(source.sheet_id, source.selected_tab)
    current_signature = headers_signature(table.headers)
    if source.headers_signature and source.headers_signature != current_signature:
        message = "Sheet headers changed. Preview and confirm mapping again before syncing."
        record_import_run(
            db,
            owner_key=owner_key,
            import_kind=source.import_kind,
            source_type=source_type,
            source_name=source.sheet_url,
            source_id=source.id,
            row_count=len(table.rows),
            status="failed",
            errors=[message],
        )
        raise ValueError(message)

    mapping = json.loads(source.mapping_json)
    if not isinstance(mapping, dict):
        raise ValueError("Saved sheet mapping is malformed.")

    missing_columns = mapping_missing_columns({str(k): str(v) for k, v in mapping.items()}, table.headers)
    if missing_columns:
        message = f"Mapping references missing columns: {', '.join(missing_columns)}."
        record_import_run(
            db,
            owner_key=owner_key,
            import_kind=source.import_kind,
            source_type=source_type,
            source_name=source.sheet_url,
            source_id=source.id,
            row_count=len(table.rows),
            status="failed",
            errors=[message],
        )
        raise ValueError(message)

    if source.import_kind == "students":
        result = import_students_rows(db, table.rows, mapping, replace_existing=replace_existing)
    else:
        result = import_schedule_rows(db, table.rows, mapping, replace_existing=replace_existing)

    source.last_synced_at = utcnow_naive()
    source.updated_at = source.last_synced_at
    db.add(source)
    db.commit()
    db.refresh(source)
    record_import_run(
        db,
        owner_key=owner_key,
        import_kind=source.import_kind,
        source_type=source_type,
        source_name=source.sheet_url,
        source_id=source.id,
        row_count=len(table.rows),
        result=result,
    )
    return result
