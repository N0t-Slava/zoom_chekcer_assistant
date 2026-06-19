import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .env_loader import load_env_file
from .routers.attendance import router as attendance_router
from .routers.meetings import router as meetings_router
from .routers.reports import router as reports_router
from .routers.schedule import router as schedule_router
from .routers.students import router as students_router
from .routers.zoom import router as zoom_router
from .schemas import HealthResponse


load_env_file()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    logger.info("Database initialized")
    yield


app = FastAPI(
    title="Zoom Attendance Tracker",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attendance_router)
app.include_router(meetings_router)
app.include_router(reports_router)
app.include_router(schedule_router)
app.include_router(students_router)
app.include_router(zoom_router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def dashboard() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/teacher-meeting", include_in_schema=False)
async def teacher_meeting() -> FileResponse:
    return FileResponse(STATIC_DIR / "teacher-meeting.html")


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
