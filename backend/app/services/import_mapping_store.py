import hashlib
import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import ImportMapping


def headers_signature(headers: list[str]) -> str:
    normalized = "\0".join(header.strip().casefold() for header in headers)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def load_confirmed_mapping(
    db: Session,
    *,
    session_id: str | None,
    import_kind: str,
    headers: list[str],
) -> ImportMapping | None:
    signature = headers_signature(headers)
    statement = (
        select(ImportMapping)
        .where(
            ImportMapping.import_kind == import_kind,
            ImportMapping.headers_signature == signature,
            ImportMapping.session_id == session_id,
        )
        .order_by(ImportMapping.updated_at.desc())
        .limit(1)
    )
    mapping = db.scalars(statement).first()
    if mapping is not None:
        return mapping

    if session_id is None:
        return None

    fallback_statement = (
        select(ImportMapping)
        .where(
            ImportMapping.import_kind == import_kind,
            ImportMapping.headers_signature == signature,
            ImportMapping.session_id.is_(None),
        )
        .order_by(ImportMapping.updated_at.desc())
        .limit(1)
    )
    return db.scalars(fallback_statement).first()


def mapping_dict(mapping: ImportMapping) -> dict[str, str]:
    try:
        value = json.loads(mapping.mapping_json)
    except json.JSONDecodeError:
        return {}
    if not isinstance(value, dict):
        return {}
    return {str(key): str(header) for key, header in value.items() if header}


def warnings_list(mapping: ImportMapping) -> list[str]:
    if not mapping.warnings_json:
        return []
    try:
        value = json.loads(mapping.warnings_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item]


def save_confirmed_mapping(
    db: Session,
    *,
    session_id: str | None,
    import_kind: str,
    file_name: str,
    headers: list[str],
    mapping: dict[str, str],
    table_type: str | None = None,
    confidence: float | None = None,
    warnings: list[str] | None = None,
) -> ImportMapping:
    now = datetime.now(UTC).replace(tzinfo=None)
    signature = headers_signature(headers)
    statement = (
        select(ImportMapping)
        .where(
            ImportMapping.import_kind == import_kind,
            ImportMapping.headers_signature == signature,
            ImportMapping.session_id == session_id,
        )
        .limit(1)
    )
    stored = db.scalars(statement).first()
    if stored is None:
        stored = ImportMapping(
            session_id=session_id,
            import_kind=import_kind,
            table_type=table_type or import_kind,
            source_name=file_name,
            headers_signature=signature,
            mapping_json="{}",
            created_at=now,
            updated_at=now,
        )
        db.add(stored)

    stored.table_type = table_type or stored.table_type or import_kind
    stored.source_name = file_name
    stored.mapping_json = json.dumps(mapping, ensure_ascii=False, sort_keys=True)
    stored.warnings_json = json.dumps(warnings or [], ensure_ascii=False)
    confidence_value = confidence if confidence is not None else 1.0
    stored.confidence_percent = int(max(0, min(100, round(confidence_value * 100))))
    stored.updated_at = now
    db.commit()
    db.refresh(stored)
    return stored
