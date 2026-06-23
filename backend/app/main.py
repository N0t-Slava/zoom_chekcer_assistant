import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

from .auth import is_public_path, zoom_session_auth
from .config import allowed_zoom_emails, cors_allowed_origins, is_production, log_level
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
    level=log_level(),
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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://zoom.us https://source.zoom.us https://*.zoom.us https://cdn.tailwindcss.com https://unpkg.com; "
        "style-src 'self' 'unsafe-inline' https://source.zoom.us https://cdn.tailwindcss.com; "
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
    if is_production() and not allowed_zoom_emails():
        logger.warning("APP_ENV=production requires ALLOWED_ZOOM_EMAILS before users can access the app")
    logger.info("Database initialized; env=%s", "production" if is_production() else "development")
    yield


app = FastAPI(
    title="Zoom Attendance Tracker",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if is_production() else "/docs",
    redoc_url=None if is_production() else "/redoc",
    openapi_url=None if is_production() else "/openapi.json",
)

cors_origins = cors_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=bool(cors_origins and "*" not in cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def protect_app_and_add_security_headers(request: Request, call_next) -> Response:
    if not is_public_path(request.url.path):
        auth_result = zoom_session_auth(request)
        if not auth_result.authorized:
            logger.info(
                "Blocked unauthenticated request path=%s reason=%s email=%s",
                request.url.path,
                auth_result.reason,
                auth_result.email or "",
            )
            if request.url.path in {"/", "/teacher-meeting"} and auth_result.reason in {
                "missing_session",
                "missing_token",
                "missing_access_token",
                "invalid_token",
            }:
                response: Response = RedirectResponse("/zoom/oauth/start")
            else:
                code = (
                    status.HTTP_403_FORBIDDEN
                    if auth_result.reason in {"allowlist_required", "email_not_allowed"}
                    else status.HTTP_401_UNAUTHORIZED
                )
                response = JSONResponse(
                    status_code=code,
                    content={"detail": "Authorize Zoom with an approved account before accessing this app."},
                )
            for header, value in SECURITY_HEADERS.items():
                response.headers.setdefault(header, value)
            return response

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
async def menu() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.head("/", include_in_schema=False)
async def menu_head() -> FileResponse:
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
