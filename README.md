# Zoom Attendance Tracker MVP

Lightweight local attendance tracker for Zoom Web meetings.

## Stack

- FastAPI backend
- SQLite database
- SQLAlchemy ORM
- Pydantic schemas
- Chrome Extension (Manifest V3)
- Minimal HTML/CSS/JS dashboard

## Project Structure

```text
backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    routers/
      attendance.py
    services/
      attendance_service.py
    static/
      index.html
      styles.css
      app.js
  requirements.txt
extension/
  manifest.json
  content.js
  background.js
main.py
```

## Setup

1. Create a virtual environment:

```bash
python3 -m venv .venv
```

2. Activate it:

```bash
source .venv/bin/activate
```

3. Install backend dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

## Run Backend

Use either command:

```bash
uvicorn backend.app.main:app --reload
```

or:

```bash
python main.py
```

Without activating the virtual environment, you can also use:

```bash
.venv/bin/uvicorn backend.app.main:app --reload
```

Backend URLs:

- API: `http://127.0.0.1:8000`
- Dashboard: `http://127.0.0.1:8000/`
- Health check: `http://127.0.0.1:8000/health`

The SQLite database is created automatically at `backend/attendance.db`.

## Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the local `extension/` folder.

## Use with Zoom Web

1. Open a Zoom Web meeting in Chrome.
2. Open the Zoom `Participants` panel and keep it visible.
3. The extension reads visible participant names every 5 seconds.
4. Updates are posted to the FastAPI backend.
5. Open `http://127.0.0.1:8000/` to see the dashboard.

## API Endpoints

- `POST /attendance/update`
- `GET /attendance/current`
- `GET /attendance/history`
- `GET /attendance/export.csv`
- `GET /health`

## Notes

- This is an MVP and depends on the Zoom participants panel being open.
- Rejoins create a new attendance record, which helps separate sessions for the same participant.
- Duplicate names from the DOM are normalized and de-duplicated before storage.
