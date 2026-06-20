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
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": (
        "default-src 'self' https://zoom.us https://*.zoom.us https://*.zoom.com; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://zoom.us https://source.zoom.us https://*.zoom.us; "
        "style-src 'self' 'unsafe-inline' https://source.zoom.us; "
        "img-src 'self' data: blob: https:; "
        "font-src 'self' data: https:; "
        "connect-src 'self' https://zoom.us https://*.zoom.us https://*.zoom.com wss://*.zoom.us wss://*.zoom.com; "
        "media-src 'self' data: blob: https:; "
        "worker-src 'self' blob:; "
        "frame-src 'self' https://zoom.us https://*.zoom.us https://*.zoom.com; "
        "child-src 'self' blob: https://zoom.us https://*.zoom.us https://*.zoom.com"
    ),
}


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


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response

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


@app.head("/", include_in_schema=False)
async def dashboard_head() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/teacher-meeting", include_in_schema=False)
async def teacher_meeting() -> FileResponse:
    return FileResponse(STATIC_DIR / "teacher-meeting.html")


@app.head("/teacher-meeting", include_in_schema=False)
async def teacher_meeting_head() -> FileResponse:
    return FileResponse(STATIC_DIR / "teacher-meeting.html")


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
