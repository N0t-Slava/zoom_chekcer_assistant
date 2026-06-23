import base64
import io
import unittest
import zipfile
from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.app.models import Base, ScheduleEntry, Student, StudentAlias
from backend.app.services.schedule_service import import_schedule_rows
from backend.app.services.student_service import import_students_rows
from backend.app.services.table_import_service import decode_file_content, parse_table_file


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

    def test_xlsx_preview_parser(self):
        table = parse_table_file("students.xlsx", _xlsx_bytes())
        self.assertEqual(table.headers, ["Name", "Group"])
        self.assertEqual(table.rows, [{"Name": "Alice", "Group": "A"}])


if __name__ == "__main__":
    unittest.main()
