import base64
import io
import sqlite3
import tempfile
import unittest
import zipfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.app.db_backup import backup_database, export_sql
from backend.app.models import Base, GoogleSheetSource, ImportMapping, ImportRun, ScheduleEntry, Student, StudentAlias
from backend.app.services.ai_mapping_service import AI_MAPPING_RESPONSE_SCHEMA, ALL_FIELDS, detect_import_mapping
from backend.app.services.google_sheet_sync_service import sync_google_sheet_source_rows
from backend.app.services.google_sheets_service import extract_sheet_id, values_to_table
from backend.app.services.import_history_service import record_import_run
from backend.app.services.import_mapping_store import load_confirmed_mapping, mapping_dict, save_confirmed_mapping
from backend.app.services.schedule_service import import_schedule_rows
from backend.app.services.student_service import import_students_rows
from backend.app.services.table_import_service import ParsedTable, decode_file_content, parse_table_file, validate_table


def _xlsx_bytes() -> bytes:
    files = {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""",
        "xl/workbook.xml": """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>""",
        "xl/_rels/workbook.xml.rels": """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""",
        "xl/worksheets/sheet1.xml": """<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="B1" t="inlineStr"><is><t>Group</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Alice</t></is></c><c r="B2" t="inlineStr"><is><t>A</t></is></c></row>
  </sheetData>
</worksheet>""",
    }
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return output.getvalue()


def _xlsx_shared_strings_bytes() -> bytes:
    files = {
        "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""",
        "xl/workbook.xml": """<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>""",
        "xl/_rels/workbook.xml.rels": """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""",
        "xl/sharedStrings.xml": """<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>Name</t></si><si><t>Group</t></si><si><t>Alice</t></si><si><t>A</t></si>
</sst>""",
        "xl/worksheets/sheet1.xml": """<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
    <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row>
  </sheetData>
</worksheet>""",
    }
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return output.getvalue()


class ImportServicesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, future=True)

    def tearDown(self):
        self.engine.dispose()

    def test_students_mapping_imports_aliases_and_updates_duplicates(self):
        rows = [
            {"Student": "Alice", "Class": "A", "Zoom": "Alice Z; Аліса"},
            {"Student": "Alice", "Class": "A", "Zoom": "Alice Zoom"},
        ]
        with self.session_factory() as db:
            result = import_students_rows(
                db,
                rows,
                {"full_name": "Student", "group_name": "Class", "aliases": "Zoom"},
            )
            students = db.scalars(select(Student)).all()
            aliases = db.scalars(select(StudentAlias)).all()

        self.assertEqual(result["created_count"], 1)
        self.assertEqual(result["updated_count"], 1)
        self.assertEqual(len(students), 1)
        self.assertEqual({alias.alias_name for alias in aliases}, {"Alice Z", "Аліса", "Alice Zoom"})

    def test_schedule_mapping_imports_and_updates_duplicates(self):
        rows = [
            {"Day": "2026-06-23", "Start": "08:30", "End": "09:30", "Class": "A", "Topic": "Math"},
            {"Day": "2026-06-23", "Start": "08:30", "End": "09:30", "Class": "A", "Topic": "Updated"},
        ]
        with self.session_factory() as db:
            result = import_schedule_rows(
                db,
                rows,
                {
                    "date": "Day",
                    "start_time": "Start",
                    "end_time": "End",
                    "group_name": "Class",
                    "title": "Topic",
                },
            )
            entries = db.scalars(select(ScheduleEntry)).all()

        self.assertEqual(result["created_count"], 1)
        self.assertEqual(result["updated_count"], 1)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].title, "Updated")

    def test_schedule_mapping_accepts_excel_serial_dates_and_times(self):
        rows = [
            {"Day": "46296", "Start": "0.3541666667", "End": "0.3958333333", "Class": "A", "Topic": "Math"},
        ]
        with self.session_factory() as db:
            result = import_schedule_rows(
                db,
                rows,
                {
                    "date": "Day",
                    "start_time": "Start",
                    "end_time": "End",
                    "group_name": "Class",
                    "title": "Topic",
                },
            )
            entry = db.scalars(select(ScheduleEntry)).one()

        self.assertEqual(result["created_count"], 1)
        self.assertEqual(entry.starts_at, datetime(2026, 10, 1, 8, 30))
        self.assertEqual(entry.ends_at, datetime(2026, 10, 1, 9, 30))

    def test_csv_preview_parser(self):
        content = base64.b64encode("Name,Group\nAlice,A\n".encode()).decode()
        table = parse_table_file("students.csv", decode_file_content(content))
        self.assertEqual(table.headers, ["Name", "Group"])
        self.assertEqual(table.rows, [{"Name": "Alice", "Group": "A"}])

    def test_csv_parser_detects_semicolon_and_quoted_values(self):
        content = base64.b64encode('Name;Group;Zoom name\n"Alice, A.";A;"Alice Zoom"\n'.encode()).decode()
        table = parse_table_file("students.csv", decode_file_content(content))
        self.assertEqual(table.headers, ["Name", "Group", "Zoom name"])
        self.assertEqual(table.rows, [{"Name": "Alice, A.", "Group": "A", "Zoom name": "Alice Zoom"}])

    def test_xlsx_preview_parser(self):
        table = parse_table_file("students.xlsx", _xlsx_bytes())
        self.assertEqual(table.headers, ["Name", "Group"])
        self.assertEqual(table.rows, [{"Name": "Alice", "Group": "A"}])

    def test_xlsx_parser_reads_shared_strings(self):
        table = parse_table_file("students.xlsx", _xlsx_shared_strings_bytes())
        self.assertEqual(table.headers, ["Name", "Group"])
        self.assertEqual(table.rows, [{"Name": "Alice", "Group": "A"}])

    def test_ai_mapping_falls_back_to_local_detection_without_api_key(self):
        with patch("backend.app.services.ai_mapping_service.openai_api_key", return_value=None):
            detection = detect_import_mapping(
                ["Name", "Group", "Zoom name"],
                [{"Name": "Alice", "Group": "A", "Zoom name": "Alice Z"}],
                "students",
            )

        self.assertEqual(detection.source, "local")
        self.assertEqual(detection.table_type, "students")
        self.assertEqual(detection.mapping["full_name"], "Name")
        self.assertEqual(detection.mapping["group_name"], "Group")
        self.assertEqual(detection.mapping["aliases"], "Zoom name")
        self.assertTrue(detection.warnings)

    def test_ai_mapping_schema_is_strict_and_complete(self):
        self.assertEqual(AI_MAPPING_RESPONSE_SCHEMA["additionalProperties"], False)
        mapping_schema = AI_MAPPING_RESPONSE_SCHEMA["properties"]["mapping"]
        self.assertEqual(mapping_schema["additionalProperties"], False)
        self.assertEqual(set(mapping_schema["required"]), set(ALL_FIELDS))
        self.assertEqual(set(mapping_schema["properties"]), set(ALL_FIELDS))
        self.assertEqual(AI_MAPPING_RESPONSE_SCHEMA["properties"]["table_type"]["enum"], ["students", "schedule", "mixed", "unknown"])

    def test_confirmed_mapping_can_be_saved_and_reused(self):
        headers = ["Name", "Group", "Zoom name"]
        with self.session_factory() as db:
            save_confirmed_mapping(
                db,
                session_id="teacher-session",
                import_kind="students",
                file_name="students.csv",
                headers=headers,
                mapping={"full_name": "Name", "group_name": "Group", "aliases": "Zoom name"},
                table_type="students",
                confidence=0.91,
                warnings=[],
            )
            stored = load_confirmed_mapping(
                db,
                session_id="teacher-session",
                import_kind="students",
                headers=headers,
            )
            mappings = db.scalars(select(ImportMapping)).all()

        self.assertEqual(len(mappings), 1)
        self.assertIsNotNone(stored)
        self.assertEqual(stored.confidence_percent, 91)
        self.assertEqual(mapping_dict(stored)["aliases"], "Zoom name")

    def test_google_sheet_id_is_extracted_from_url(self):
        self.assertEqual(
            extract_sheet_id("https://docs.google.com/spreadsheets/d/abc123DEF456/edit#gid=0"),
            "abc123DEF456",
        )
        self.assertEqual(extract_sheet_id("abc123DEF456789012345"), "abc123DEF456789012345")

    def test_google_sheet_values_convert_to_table(self):
        table = values_to_table(
            [
                ["Name", "Group", "Zoom name"],
                ["Alice", "A", "Alice Z"],
                ["Bob", "B"],
            ]
        )
        self.assertEqual(table.headers, ["Name", "Group", "Zoom name"])
        self.assertEqual(
            table.rows,
            [
                {"Name": "Alice", "Group": "A", "Zoom name": "Alice Z"},
                {"Name": "Bob", "Group": "B", "Zoom name": ""},
            ],
        )

    def test_google_sheet_values_trim_and_skip_empty_rows(self):
        table = values_to_table(
            [
                [" Name ", " Group "],
                ["  Alice  ", " A "],
                ["", ""],
            ]
        )
        self.assertEqual(table.headers, ["Name", "Group"])
        self.assertEqual(table.rows, [{"Name": "Alice", "Group": "A"}])

    def test_duplicate_aliases_in_same_import_are_deduplicated(self):
        rows = [{"Student": "Alice", "Class": "A", "Zoom": "Alice Z; Alice Z;  Аліса  "}]
        with self.session_factory() as db:
            result = import_students_rows(
                db,
                rows,
                {"full_name": "Student", "group_name": "Class", "aliases": "Zoom"},
            )
            aliases = db.scalars(select(StudentAlias)).all()

        self.assertEqual(result["aliases_created_count"], 2)
        self.assertEqual({alias.alias_name for alias in aliases}, {"Alice Z", "Аліса"})

    def test_duplicate_headers_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "duplicate headers"):
            validate_table(ParsedTable(headers=["Name", " name "], rows=[{"Name": "Alice"}]))

    def test_empty_headers_are_rejected(self):
        content = base64.b64encode("Name,\nAlice,A\n".encode()).decode()
        with self.assertRaisesRegex(ValueError, "empty header"):
            parse_table_file("students.csv", decode_file_content(content))

    def test_import_history_records_run_summary(self):
        with self.session_factory() as db:
            record_import_run(
                db,
                owner_key="zoom-email:teacher@example.com",
                import_kind="students",
                source_type="file",
                source_name="students.csv",
                source_id=None,
                row_count=2,
                result={"imported_count": 1, "created_count": 1, "updated_count": 0, "skipped_count": 1, "errors": ["bad row"]},
            )
            run = db.scalars(select(ImportRun)).one()

        self.assertEqual(run.status, "completed_with_errors")
        self.assertEqual(run.row_count, 2)
        self.assertEqual(run.imported_count, 1)

    def test_google_sheet_sync_blocks_changed_headers_and_records_history(self):
        with self.session_factory() as db:
            source = GoogleSheetSource(
                session_id="zoom-email:teacher@example.com",
                import_kind="students",
                sheet_id="sheet123",
                sheet_url="https://docs.google.com/spreadsheets/d/sheet123/edit",
                selected_tab="Students",
                headers_signature="old-signature",
                table_type="students",
                mapping_json='{"full_name": "Name", "group_name": "Group"}',
                created_at=datetime(2026, 1, 1),
                updated_at=datetime(2026, 1, 1),
            )
            db.add(source)
            db.commit()
            db.refresh(source)
            with patch(
                "backend.app.services.google_sheet_sync_service.read_sheet_table",
                return_value=ParsedTable(headers=["Full Name", "Group"], rows=[{"Full Name": "Alice", "Group": "A"}]),
            ):
                with self.assertRaisesRegex(ValueError, "headers changed"):
                    sync_google_sheet_source_rows(
                        db,
                        source=source,
                        owner_key="zoom-email:teacher@example.com",
                    )
            run = db.scalars(select(ImportRun)).one()

        self.assertEqual(run.status, "failed")
        self.assertEqual(run.source_type, "google_sheets")

    def test_database_backup_and_sql_export(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            source = tmp_path / "source.sqlite3"
            backup = tmp_path / "backup.sqlite3"
            dump = tmp_path / "dump.sql"
            with sqlite3.connect(source) as connection:
                connection.execute("CREATE TABLE demo (name TEXT)")
                connection.execute("INSERT INTO demo (name) VALUES ('Alice')")
                connection.commit()

            backup_database(source, backup)
            export_sql(source, dump)

            with sqlite3.connect(backup) as connection:
                value = connection.execute("SELECT name FROM demo").fetchone()[0]
            self.assertEqual(value, "Alice")
            self.assertIn("CREATE TABLE demo", dump.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
