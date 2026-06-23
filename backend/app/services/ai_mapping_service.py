import json
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass

from ..config import openai_api_key, openai_mapping_model
from .table_import_service import suggest_mapping


logger = logging.getLogger(__name__)

STUDENT_MAPPING_ALIASES = {
    "full_name": ["full_name", "name", "student", "student_name", "student name", "піб", "учень"],
    "group_name": ["group_name", "group", "group_id", "class", "група", "клас"],
    "aliases": ["aliases", "alias", "zoom_name", "zoom_names", "zoom name", "нік", "псевдонім"],
}
SCHEDULE_MAPPING_ALIASES = {
    "date": ["date", "day", "lesson_date", "lesson date", "дата"],
    "start_time": ["start_time", "start", "starts_at", "start time", "початок"],
    "end_time": ["end_time", "end", "ends_at", "end time", "кінець", "завершення"],
    "group_name": ["group_name", "group", "group_id", "class", "група", "клас"],
    "title": ["title", "lesson", "name", "topic", "назва", "урок", "тема"],
}
ALL_FIELDS = ("full_name", "group_name", "aliases", "date", "start_time", "end_time", "title")
AI_MAPPING_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "table_type": {"type": "string", "enum": ["students", "schedule", "mixed", "unknown"]},
        "mapping": {
            "type": "object",
            "properties": {
                field: {"type": ["string", "null"]}
                for field in ALL_FIELDS
            },
            "required": list(ALL_FIELDS),
            "additionalProperties": False,
        },
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "warnings": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["table_type", "mapping", "confidence", "warnings"],
    "additionalProperties": False,
}


@dataclass(frozen=True)
class MappingDetection:
    table_type: str
    mapping: dict[str, str]
    confidence: float
    warnings: list[str]
    source: str


def detect_import_mapping(
    headers: list[str],
    sample_rows: list[dict[str, str]],
    import_kind: str,
    learned_aliases: dict[str, list[str]] | None = None,
) -> MappingDetection:
    local_detection = _local_detection(headers, import_kind, learned_aliases=learned_aliases)
    api_key = openai_api_key()
    if not api_key:
        return local_detection

    try:
        ai_detection = _openai_detection(api_key, headers, sample_rows, import_kind)
    except (OSError, ValueError, KeyError, urllib.error.URLError) as exc:
        logger.warning("OpenAI import mapping failed; using local suggestions: %s", exc)
        return MappingDetection(
            table_type=local_detection.table_type,
            mapping=local_detection.mapping,
            confidence=local_detection.confidence,
            warnings=["AI mapping is unavailable right now; using local suggestions."] + local_detection.warnings,
            source="local",
        )

    merged = {**ai_detection.mapping, **local_detection.mapping}
    warnings = ai_detection.warnings
    if not merged:
        warnings = ["No confident mapping was detected."] + warnings
    return MappingDetection(
        table_type=ai_detection.table_type,
        mapping=merged,
        confidence=ai_detection.confidence,
        warnings=warnings,
        source="openai" if ai_detection.mapping else local_detection.source,
    )


def _local_detection(
    headers: list[str],
    import_kind: str,
    learned_aliases: dict[str, list[str]] | None = None,
) -> MappingDetection:
    student_mapping = _suggest_local_mapping(headers, STUDENT_MAPPING_ALIASES, learned_aliases, import_kind, "students")
    schedule_mapping = _suggest_local_mapping(headers, SCHEDULE_MAPPING_ALIASES, learned_aliases, import_kind, "schedule")
    table_type = _detect_table_type(student_mapping, schedule_mapping)
    mapping = student_mapping if import_kind == "students" else schedule_mapping
    confidence = _local_confidence(student_mapping, schedule_mapping, import_kind)
    source = "learned" if _mapping_uses_learned(mapping, learned_aliases) else "local"
    warnings = ["OpenAI mapping is not configured; using local suggestions."]
    return MappingDetection(
        table_type=table_type,
        mapping=mapping,
        confidence=confidence,
        warnings=warnings,
        source=source,
    )


def _suggest_local_mapping(
    headers: list[str],
    built_in_aliases: dict[str, list[str]],
    learned_aliases: dict[str, list[str]] | None,
    requested_import_kind: str,
    aliases_import_kind: str,
) -> dict[str, str]:
    learned_mapping = suggest_mapping(headers, learned_aliases or {}) if requested_import_kind == aliases_import_kind else {}
    built_in_mapping = suggest_mapping(headers, built_in_aliases)
    return {**built_in_mapping, **learned_mapping}


def _mapping_uses_learned(mapping: dict[str, str], learned_aliases: dict[str, list[str]] | None) -> bool:
    learned_lookup = {
        (field, alias.casefold())
        for field, aliases in (learned_aliases or {}).items()
        for alias in aliases
    }
    return any((field, header.casefold()) in learned_lookup for field, header in mapping.items())


def _detect_table_type(student_mapping: dict[str, str], schedule_mapping: dict[str, str]) -> str:
    student_score = int("full_name" in student_mapping) + int("group_name" in student_mapping)
    schedule_score = sum(field in schedule_mapping for field in ("date", "start_time", "end_time", "group_name"))
    if student_score >= 2 and schedule_score >= 3:
        return "mixed"
    if student_score >= 2:
        return "students"
    if schedule_score >= 3:
        return "schedule"
    return "unknown"


def _local_confidence(student_mapping: dict[str, str], schedule_mapping: dict[str, str], import_kind: str) -> float:
    if import_kind == "students":
        return min(0.75, 0.25 + (0.25 * len(student_mapping)))
    return min(0.75, 0.15 + (0.15 * len(schedule_mapping)))


def _openai_detection(
    api_key: str,
    headers: list[str],
    sample_rows: list[dict[str, str]],
    import_kind: str,
) -> MappingDetection:
    body = {
        "model": openai_mapping_model(),
        "input": [
            {
                "role": "system",
                "content": (
                    "You map uploaded school attendance spreadsheets. Return only the strict JSON schema. "
                    "Use exact header names from the provided headers. If a field is absent, use null."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "target_import_screen": import_kind,
                        "headers": headers,
                        "sample_rows": sample_rows[:5],
                        "fields": {
                            "students": ["full_name", "group_name", "aliases"],
                            "schedule": ["date", "start_time", "end_time", "group_name", "title"],
                        },
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "import_column_mapping",
                "strict": True,
                "schema": AI_MAPPING_RESPONSE_SCHEMA,
            }
        },
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))

    parsed = json.loads(_extract_response_text(payload))
    mapping = _sanitize_mapping(parsed.get("mapping", {}), headers)
    return MappingDetection(
        table_type=str(parsed.get("table_type") or "unknown"),
        mapping=mapping,
        confidence=max(0.0, min(1.0, float(parsed.get("confidence") or 0))),
        warnings=[str(warning) for warning in parsed.get("warnings", []) if warning],
        source="openai",
    )


def _extract_response_text(payload: dict[str, object]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text
    for item in payload.get("output", []) if isinstance(payload.get("output"), list) else []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []) if isinstance(item.get("content"), list) else []:
            if isinstance(content, dict) and isinstance(content.get("text"), str):
                return content["text"]
    raise ValueError("OpenAI response did not contain text output.")


def _sanitize_mapping(mapping: object, headers: list[str]) -> dict[str, str]:
    if not isinstance(mapping, dict):
        return {}
    valid_headers = set(headers)
    clean: dict[str, str] = {}
    for field in ALL_FIELDS:
        value = mapping.get(field)
        if isinstance(value, str) and value in valid_headers:
            clean[field] = value
    return clean
