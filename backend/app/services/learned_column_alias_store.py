from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import LearnedColumnAlias
from .table_import_service import clean_cell


def normalize_header_alias(value: str) -> str:
    return clean_cell(value).casefold()


def load_learned_aliases(
    db: Session,
    *,
    session_id: str | None,
    import_kind: str,
) -> dict[str, list[str]]:
    aliases = _load_alias_rows(db, session_id=session_id, import_kind=import_kind)
    result: dict[str, list[str]] = {}
    seen: set[tuple[str, str]] = set()
    now = _now()

    for alias in aliases:
        key = (alias.field_name, alias.normalized_header)
        if key in seen:
            continue
        seen.add(key)
        result.setdefault(alias.field_name, []).append(alias.header_text)
        alias.last_used_at = now

    if aliases:
        db.commit()
    return result


def save_learned_aliases(
    db: Session,
    *,
    session_id: str | None,
    import_kind: str,
    headers: list[str],
    mapping: dict[str, str],
    source: str = "manual_confirmed",
) -> None:
    header_by_normalized = {normalize_header_alias(header): header for header in headers if clean_cell(header)}
    now = _now()

    for field_name, header_text in mapping.items():
        normalized_header = normalize_header_alias(header_text)
        if not normalized_header or normalized_header not in header_by_normalized:
            continue

        existing = db.scalars(
            select(LearnedColumnAlias)
            .where(
                LearnedColumnAlias.session_id == session_id,
                LearnedColumnAlias.import_kind == import_kind,
                LearnedColumnAlias.field_name == field_name,
                LearnedColumnAlias.normalized_header == normalized_header,
            )
            .limit(1)
        ).first()
        if existing is None:
            db.add(
                LearnedColumnAlias(
                    session_id=session_id,
                    import_kind=import_kind,
                    field_name=field_name,
                    header_text=header_by_normalized[normalized_header],
                    normalized_header=normalized_header,
                    source=source,
                    confidence_count=1,
                    created_at=now,
                    updated_at=now,
                    last_used_at=now,
                )
            )
            continue

        existing.header_text = header_by_normalized[normalized_header]
        existing.source = source
        existing.confidence_count += 1
        existing.updated_at = now
        existing.last_used_at = now

    db.commit()


def _load_alias_rows(
    db: Session,
    *,
    session_id: str | None,
    import_kind: str,
) -> list[LearnedColumnAlias]:
    rows = db.scalars(
        select(LearnedColumnAlias)
        .where(
            LearnedColumnAlias.session_id == session_id,
            LearnedColumnAlias.import_kind == import_kind,
        )
        .order_by(LearnedColumnAlias.confidence_count.desc(), LearnedColumnAlias.updated_at.desc())
    ).all()
    if session_id is None:
        return rows

    global_rows = db.scalars(
        select(LearnedColumnAlias)
        .where(
            LearnedColumnAlias.session_id.is_(None),
            LearnedColumnAlias.import_kind == import_kind,
        )
        .order_by(LearnedColumnAlias.confidence_count.desc(), LearnedColumnAlias.updated_at.desc())
    ).all()
    return [*rows, *global_rows]


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
