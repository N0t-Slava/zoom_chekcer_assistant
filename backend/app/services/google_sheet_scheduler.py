import asyncio
import logging
from contextlib import suppress

from sqlalchemy import select

from ..config import google_sheet_auto_sync_interval_seconds, google_sheet_auto_sync_replace_existing
from ..database import SessionLocal
from ..models import GoogleSheetSource
from .google_sheet_sync_service import sync_google_sheet_source_rows


logger = logging.getLogger(__name__)


async def run_google_sheet_auto_sync() -> None:
    interval = google_sheet_auto_sync_interval_seconds()
    logger.info("Google Sheet auto-sync scheduler started; interval=%ss", interval)
    try:
        while True:
            await asyncio.sleep(interval)
            await asyncio.to_thread(sync_enabled_google_sheets_once)
    except asyncio.CancelledError:
        logger.info("Google Sheet auto-sync scheduler stopped")
        raise


def sync_enabled_google_sheets_once() -> None:
    replace_existing = google_sheet_auto_sync_replace_existing()
    with SessionLocal() as db:
        sources = db.scalars(
            select(GoogleSheetSource)
            .where(GoogleSheetSource.auto_sync_enabled == 1)
            .order_by(GoogleSheetSource.updated_at)
        ).all()
        for source in sources:
            try:
                sync_google_sheet_source_rows(
                    db,
                    source=source,
                    owner_key=source.session_id,
                    replace_existing=replace_existing,
                    source_type="scheduled_google_sheets",
                )
            except Exception:
                logger.exception("Scheduled Google Sheet sync failed for source_id=%s", source.id)


async def stop_google_sheet_auto_sync(task: asyncio.Task[None] | None) -> None:
    if task is None:
        return
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task
