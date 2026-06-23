import argparse
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from .database import DATABASE_PATH


def timestamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%d-%H%M%S")


def backup_database(source: Path, output: Path) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source) as source_connection, sqlite3.connect(output) as output_connection:
        source_connection.backup(output_connection)
    return output


def export_sql(source: Path, output: Path) -> Path:
    output.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source) as source_connection, output.open("w", encoding="utf-8") as handle:
        for line in source_connection.iterdump():
            handle.write(f"{line}\n")
    return output


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Backup or export the Zoom attendance SQLite database.")
    parser.add_argument("--database", default=str(DATABASE_PATH), help="SQLite database path.")
    parser.add_argument("--output-dir", default="backups", help="Directory for generated backup files.")
    parser.add_argument("--name", default=None, help="Base output name without extension.")
    parser.add_argument("--sql", action="store_true", help="Also export a .sql dump.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    source = Path(args.database)
    if not source.exists():
        raise SystemExit(f"Database not found: {source}")

    output_dir = Path(args.output_dir)
    base_name = args.name or f"attendance-{timestamp()}"
    sqlite_path = backup_database(source, output_dir / f"{base_name}.sqlite3")
    print(f"SQLite backup: {sqlite_path}")
    if args.sql:
        sql_path = export_sql(source, output_dir / f"{base_name}.sql")
        print(f"SQL export: {sql_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
