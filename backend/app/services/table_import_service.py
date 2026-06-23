import base64
import binascii
import csv
import io
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree


WHITESPACE_RE = re.compile(r"\s+")
XML_NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}


@dataclass(frozen=True)
class ParsedTable:
    headers: list[str]
    rows: list[dict[str, str]]


def clean_cell(value: object | None) -> str:
    return WHITESPACE_RE.sub(" ", str(value or "")).strip()


def decode_file_content(file_content_base64: str) -> bytes:
    try:
        return base64.b64decode(file_content_base64.encode("ascii"), validate=True)
    except (binascii.Error, UnicodeEncodeError) as exc:
        raise ValueError("File content is not valid base64.") from exc


def parse_table_file(file_name: str, file_content: bytes) -> ParsedTable:
    suffix = Path(file_name).suffix.casefold()
    if suffix == ".xlsx":
        table = parse_xlsx_table(file_content)
    else:
        table = parse_csv_table(file_content)
    validate_table(table)
    return table


def parse_csv_table(file_content: bytes) -> ParsedTable:
    text = file_content.decode("utf-8-sig")
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample)
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    headers = [clean_cell(header) for header in reader.fieldnames or []]
    rows: list[dict[str, str]] = []
    for row in reader:
        rows.append({header: clean_cell(row.get(header)) for header in headers})
    return ParsedTable(headers=headers, rows=rows)


def _xlsx_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for item in root.findall("main:si", XML_NS):
        parts = [node.text or "" for node in item.findall(".//main:t", XML_NS)]
        strings.append("".join(parts))
    return strings


def _xlsx_first_sheet_path(archive: zipfile.ZipFile) -> str:
    workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
    sheet = workbook.find("main:sheets/main:sheet", XML_NS)
    if sheet is None:
        raise ValueError("XLSX workbook has no sheets.")

    relationship_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    if not relationship_id:
        return "xl/worksheets/sheet1.xml"

    relationships = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    for relationship in relationships.findall("rel:Relationship", REL_NS):
        if relationship.attrib.get("Id") == relationship_id:
            target = relationship.attrib.get("Target", "worksheets/sheet1.xml")
            return f"xl/{target.lstrip('/')}" if not target.startswith("xl/") else target
    return "xl/worksheets/sheet1.xml"


def _xlsx_cell_value(cell: ElementTree.Element, shared_strings: list[str]) -> str:
    value_node = cell.find("main:v", XML_NS)
    inline_text = cell.find("main:is/main:t", XML_NS)
    if inline_text is not None:
        return clean_cell(inline_text.text)
    if value_node is None or value_node.text is None:
        return ""
    value = value_node.text
    if cell.attrib.get("t") == "s":
        try:
            return clean_cell(shared_strings[int(value)])
        except (ValueError, IndexError):
            return ""
    return clean_cell(value)


def _xlsx_column_index(cell_ref: str) -> int:
    letters = "".join(character for character in cell_ref if character.isalpha()).upper()
    index = 0
    for character in letters:
        index = index * 26 + (ord(character) - ord("A") + 1)
    return max(0, index - 1)


def parse_xlsx_table(file_content: bytes) -> ParsedTable:
    with zipfile.ZipFile(io.BytesIO(file_content)) as archive:
        shared_strings = _xlsx_shared_strings(archive)
        sheet_path = _xlsx_first_sheet_path(archive)
        root = ElementTree.fromstring(archive.read(sheet_path))

    raw_rows: list[list[str]] = []
    for row in root.findall(".//main:sheetData/main:row", XML_NS):
        values: list[str] = []
        for cell in row.findall("main:c", XML_NS):
            index = _xlsx_column_index(cell.attrib.get("r", ""))
            while len(values) <= index:
                values.append("")
            values[index] = _xlsx_cell_value(cell, shared_strings)
        if any(values):
            raw_rows.append(values)

    if not raw_rows:
        return ParsedTable(headers=[], rows=[])

    headers = [clean_cell(header) for header in raw_rows[0]]
    rows = []
    for raw_row in raw_rows[1:]:
        row = {}
        for index, header in enumerate(headers):
            if header:
                row[header] = clean_cell(raw_row[index] if index < len(raw_row) else "")
        rows.append(row)
    return ParsedTable(headers=headers, rows=rows)


def suggest_mapping(headers: list[str], aliases: dict[str, list[str]]) -> dict[str, str]:
    normalized_headers = {header.casefold(): header for header in headers}
    mapping: dict[str, str] = {}
    for field, candidates in aliases.items():
        for candidate in candidates:
            if candidate.casefold() in normalized_headers:
                mapping[field] = normalized_headers[candidate.casefold()]
                break
    return mapping


def preview_rows(rows: list[dict[str, str]], limit: int = 5) -> list[dict[str, str]]:
    return rows[:limit]


def validate_table(table: ParsedTable) -> None:
    if not table.headers:
        raise ValueError("Imported table must include a header row.")
    normalized_headers = [header.strip().casefold() for header in table.headers if header.strip()]
    if len(normalized_headers) != len(table.headers):
        raise ValueError("Imported table contains an empty header.")
    duplicates = sorted({header for header in normalized_headers if normalized_headers.count(header) > 1})
    if duplicates:
        raise ValueError(f"Imported table contains duplicate headers: {', '.join(duplicates)}.")
    if not table.rows:
        raise ValueError("Imported table must include at least one data row.")
    if all(not any(value for value in row.values()) for row in table.rows):
        raise ValueError("Imported table data rows are empty.")


def mapping_missing_columns(mapping: dict[str, str], headers: list[str]) -> list[str]:
    header_set = set(headers)
    return [column for column in mapping.values() if column and column not in header_set]
