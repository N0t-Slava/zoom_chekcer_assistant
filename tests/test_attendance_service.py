import unittest
from datetime import datetime, timedelta

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.app.models import Base, AttendanceRecord, Meeting, ScheduleEntry, Student, StudentAlias
from backend.app.services import attendance_service, report_service


class AttendanceServiceTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:", future=True)
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, future=True)
        self.now = datetime(2026, 6, 22, 10, 0, 0)
        self.original_attendance_time = attendance_service.current_time
        self.original_report_time = report_service.current_time
        attendance_service.current_time = lambda: self.now
        report_service.current_time = lambda: self.now

    def tearDown(self):
        attendance_service.current_time = self.original_attendance_time
        report_service.current_time = self.original_report_time
        self.engine.dispose()

    def test_repeated_update_reuses_open_same_day_meeting(self):
        with self.session_factory() as db:
            first = attendance_service.process_attendance_update(
                db, "1234567890", ["Alice", "Bob", " alice "]
            )
            second = attendance_service.process_attendance_update(
                db, "1234567890", ["Alice", "Charlie"]
            )

            meetings = db.scalars(select(Meeting)).all()
            records = db.scalars(
                select(AttendanceRecord).order_by(AttendanceRecord.participant_name)
            ).all()

            self.assertEqual(first["meeting_session_id"], second["meeting_session_id"])
            self.assertEqual(len(meetings), 1)
            self.assertEqual(
                [(record.participant_name, record.status) for record in records],
                [("Alice", "active"), ("Bob", "left"), ("Charlie", "active")],
            )

    def test_repeated_five_second_check_updates_same_record(self):
        with self.session_factory() as db:
            first = attendance_service.process_attendance_update(db, "1234567890", ["Alice"])
            self.now = self.now + timedelta(seconds=5)
            second = attendance_service.process_attendance_update(db, "1234567890", ["Alice"])

            records = db.scalars(select(AttendanceRecord)).all()

            self.assertEqual(first["meeting_session_id"], second["meeting_session_id"])
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0].participant_name, "Alice")
            self.assertEqual(records[0].total_seconds, 5)

    def test_alias_names_update_same_student_record_during_sync(self):
        with self.session_factory() as db:
            student = Student(
                full_name="Ivan Petrov",
                normalized_name="ivan petrov",
                group_name="A",
                created_at=self.now,
                updated_at=self.now,
            )
            schedule = ScheduleEntry(
                title="Lesson",
                group_name="A",
                starts_at=self.now - timedelta(minutes=10),
                ends_at=self.now + timedelta(minutes=50),
                created_at=self.now,
                updated_at=self.now,
            )
            db.add_all([student, schedule])
            db.flush()
            db.add(
                StudentAlias(
                    student_id=student.id,
                    alias_name="Іван Петров",
                    normalized_name="іван петров",
                    created_at=self.now,
                    updated_at=self.now,
                )
            )
            db.commit()

            first = attendance_service.process_attendance_update(db, "1234567890", ["Ivan Petrov"])
            self.now = self.now + timedelta(seconds=5)
            second = attendance_service.process_attendance_update(db, "1234567890", ["Іван Петров"])

            records = db.scalars(select(AttendanceRecord)).all()

            self.assertEqual(first["meeting_session_id"], second["meeting_session_id"])
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0].participant_name, "Іван Петров")
            self.assertEqual(records[0].total_seconds, 5)

    def test_closed_or_next_day_meeting_creates_new_session(self):
        with self.session_factory() as db:
            first = attendance_service.process_attendance_update(db, "1234567890", ["Alice"])
            attendance_service.close_meeting(db, db.get(Meeting, first["meeting_session_id"]))

            after_close = attendance_service.process_attendance_update(db, "1234567890", ["Alice"])
            self.assertNotEqual(first["meeting_session_id"], after_close["meeting_session_id"])

            self.now = self.now + timedelta(days=1)
            next_day = attendance_service.process_attendance_update(db, "1234567890", ["Alice"])
            self.assertNotEqual(after_close["meeting_session_id"], next_day["meeting_session_id"])

    def test_duplicate_records_are_merged_when_history_is_read(self):
        with self.session_factory() as db:
            meeting = Meeting(
                zoom_meeting_id="1234567890",
                started_at=self.now,
                created_at=self.now,
            )
            db.add(meeting)
            db.flush()
            db.add_all(
                [
                    AttendanceRecord(
                        participant_name="Teacher",
                        meeting_id="1234567890",
                        meeting_session_id=meeting.id,
                        first_seen=self.now,
                        last_seen=self.now,
                        total_seconds=0,
                        status="active",
                    ),
                    AttendanceRecord(
                        participant_name="teacher",
                        meeting_id="1234567890",
                        meeting_session_id=meeting.id,
                        first_seen=self.now,
                        last_seen=self.now + timedelta(seconds=10),
                        total_seconds=10,
                        status="active",
                    ),
                ]
            )
            db.commit()

            records = attendance_service.list_attendance_history(db, meeting_session_id=meeting.id)

            self.assertEqual(len(records), 1)
            self.assertEqual(records[0].participant_name.casefold(), "teacher")
            self.assertEqual(
                len(db.scalars(select(AttendanceRecord)).all()),
                1,
            )

    def test_report_summary_does_not_double_count_duplicate_records(self):
        with self.session_factory() as db:
            student = Student(
                full_name="Alice Student",
                normalized_name="alice student",
                group_name="A",
                created_at=self.now,
                updated_at=self.now,
            )
            schedule = ScheduleEntry(
                title="Lesson",
                group_name="A",
                starts_at=self.now - timedelta(minutes=10),
                ends_at=self.now + timedelta(minutes=50),
                created_at=self.now,
                updated_at=self.now,
            )
            db.add_all([student, schedule])
            db.flush()
            meeting = Meeting(
                zoom_meeting_id="1234567890",
                schedule_entry_id=schedule.id,
                title="Lesson",
                group_name="A",
                started_at=self.now,
                created_at=self.now,
            )
            db.add(meeting)
            db.flush()
            db.add_all(
                [
                    AttendanceRecord(
                        participant_name="Alice Student",
                        meeting_id="1234567890",
                        meeting_session_id=meeting.id,
                        first_seen=self.now,
                        last_seen=self.now + timedelta(seconds=10),
                        total_seconds=10,
                        status="left",
                    ),
                    AttendanceRecord(
                        participant_name="alice student",
                        meeting_id="1234567890",
                        meeting_session_id=meeting.id,
                        first_seen=self.now,
                        last_seen=self.now + timedelta(seconds=20),
                        total_seconds=20,
                        status="left",
                    ),
                ]
            )
            db.commit()

            report_service.refresh_attendance_summary_for_schedule(db, schedule, self.now)
            summary = report_service.list_attendance_summaries(db)[0]

            self.assertEqual(summary.status, "п")
            self.assertEqual(summary.total_seconds, 20)

    def test_report_summary_combines_alias_time_for_same_student(self):
        with self.session_factory() as db:
            student = Student(
                full_name="Ivan Petrov",
                normalized_name="ivan petrov",
                group_name="A",
                created_at=self.now,
                updated_at=self.now,
            )
            schedule = ScheduleEntry(
                title="Lesson",
                group_name="A",
                starts_at=self.now - timedelta(minutes=10),
                ends_at=self.now + timedelta(minutes=50),
                created_at=self.now,
                updated_at=self.now,
            )
            db.add_all([student, schedule])
            db.flush()
            db.add(
                StudentAlias(
                    student_id=student.id,
                    alias_name="Іван Петров",
                    normalized_name="іван петров",
                    created_at=self.now,
                    updated_at=self.now,
                )
            )
            meeting = Meeting(
                zoom_meeting_id="1234567890",
                schedule_entry_id=schedule.id,
                title="Lesson",
                group_name="A",
                started_at=self.now,
                created_at=self.now,
            )
            db.add(meeting)
            db.flush()
            db.add_all(
                [
                    AttendanceRecord(
                        participant_name="Ivan Petrov",
                        meeting_id="1234567890",
                        meeting_session_id=meeting.id,
                        first_seen=self.now,
                        last_seen=self.now + timedelta(minutes=10),
                        total_seconds=600,
                        status="left",
                    ),
                    AttendanceRecord(
                        participant_name="Іван Петров",
                        meeting_id="1234567890",
                        meeting_session_id=meeting.id,
                        first_seen=self.now + timedelta(minutes=8),
                        last_seen=self.now + timedelta(minutes=25),
                        total_seconds=1020,
                        status="left",
                    ),
                ]
            )
            db.commit()

            report_service.refresh_attendance_summary_for_schedule(db, schedule, self.now)
            summary = report_service.list_attendance_summaries(db)[0]

            self.assertEqual(summary.status, "п")
            self.assertEqual(summary.total_seconds, 1500)


if __name__ == "__main__":
    unittest.main()
