# Zoom Attendance Tracker

Local app for tracking attendance in Zoom Web meetings.

It has two parts:

- **Backend + dashboard**: runs locally at `http://127.0.0.1:8000/`.
- **Browser extension**: reads the visible Zoom participants list and sends it to the backend.

The app can import students, import schedule, track Zoom attendance, and generate a journal with `п` / `н`.

## Quick Start

Run these commands from the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python main.py
```

Then open:

```text
http://127.0.0.1:8000/
```

So if the page opens, the backend is running.

## Alternative Run Command

Instead of `python main.py`, you can run:

```bash
.venv/bin/uvicorn backend.app.main:app --reload
```

or, if the virtual environment is activated:

```bash
uvicorn backend.app.main:app --reload
```

## Check That Backend Works

Open this URL:

```text
http://127.0.0.1:8000/health
```

Expected response:

```json
{ "status": "ok" }
```

The SQLite database is created automatically here:

```text
backend/attendance.db
```

## Install The Extension

1. Open Chrome or Chromium.
2. Go to:

```text
chrome://extensions/
```

3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this folder:

```text
extension/
```

After loading, the extension icon should appear in the browser toolbar.

## Use With Zoom

1. Start the backend.
2. Load the extension.
3. Open a Zoom Web meeting.
4. Open the Zoom `Participants` panel.
5. Keep the participants panel visible.
6. Open the dashboard:

```text
http://127.0.0.1:8000/
```

The extension sends participant names every 5 seconds.

You can click the extension icon to see:

- backend online/offline status;
- current meeting id;
- participant count;
- last send time;
- linked lesson/group;
- `Force Send Now`;
- `Open Dashboard`.

## Dashboard Workflow

Use the dashboard in this order:

1. Import students CSV.
2. Import schedule CSV.
3. Run Zoom meetings with the extension enabled.
4. Check the `Meetings` table.
5. Edit meeting title/group if needed.
6. Click `Generate Journal`.
7. Download `Export Matrix CSV`.

## Teacher Meeting SDK Prototype

Open the teacher SDK page here:

```text
http://127.0.0.1:8000/teacher-meeting
```

To prepare a Zoom Meeting SDK join, set these environment variables before starting the backend:

```bash
export ZOOM_CLIENT_ID="your_meeting_sdk_client_id"
export ZOOM_CLIENT_SECRET="your_meeting_sdk_client_secret"
export ZOOM_OAUTH_REDIRECT_URL="http://127.0.0.1:8000/zoom/oauth/callback"
```

Optional:

```bash
export ZOOM_MEETING_SDK_JS_URL="https://source.zoom.us/3.13.2/zoom-meeting-3.13.2.min.js"
```

The teacher SDK page is a prototype. Students can still join through the normal Zoom link.

To join as the meeting host, authorize Zoom from the teacher page. In the Zoom app settings, use this OAuth redirect URL:

```text
http://127.0.0.1:8000/zoom/oauth/callback
```

The app also needs a user token/ZAK scope such as `user:read:token`.

## Students CSV

Recommended format:

```csv
full_name,group_name
Ivan Petrov,252
Anna Kovalenko,252
Maria Shevchenko,253
```

Short format also works:

```csv
name,group
Ivan Petrov,252
Anna Kovalenko,252
```

Important: names in Zoom should match the imported student names as closely as possible.

## Schedule CSV

Recommended format:

```csv
date,start_time,end_time,group_name,title
2026-06-09,08:30,10:00,252,Lesson 1
2026-06-09,11:30,13:00,253,Lesson 2
```

Supported date formats:

```text
2026-06-09
09.06.2026
09/06/2026
```

Supported time formats:

```text
08:30
08:30:00
```

Schedule times are interpreted in the app timezone. By default this is `Europe/Kyiv`.
Set `APP_TIMEZONE` before starting the backend if you need a different timezone.

If a Zoom meeting starts during a scheduled lesson, the backend automatically links that meeting to the lesson group/title.

## Attendance Logic

- A participant is active only if they were seen in the last 30 seconds.
- If a participant disappears for more than 30 seconds, they become `left`.
- If a participant leaves and joins again, this can create a separate attendance record.
- Journal status:
  - `п` means the student was seen at least once.
  - `н` means the student was expected but never seen.

## Exported Journal Example

```csv
student,group,2026-06-09 08:30 252 Lesson 1,2026-06-09 11:30 253 Lesson 2
Ivan Petrov,252,п,
Anna Kovalenko,252,н,
Maria Shevchenko,253,,п
```

Empty cells mean that the student is not part of the group scheduled for that lesson.

## Project Structure

```text
backend/
  app/
    main.py
    database.py
    models.py
    schemas.py
    routers/
    services/
    static/
  requirements.txt
extension/
  manifest.json
  content.js
  background.js
  popup.html
  popup.css
  popup.js
main.py
```

## Main URLs

- Dashboard: `http://127.0.0.1:8000/`
- Health check: `http://127.0.0.1:8000/health`
- Attendance CSV: `http://127.0.0.1:8000/attendance/export.csv`
- Journal matrix CSV: `http://127.0.0.1:8000/reports/attendance-matrix.csv`

## Main API Endpoints

- `POST /attendance/update`
- `GET /attendance/current`
- `GET /attendance/history`
- `GET /meetings`
- `GET /students`
- `POST /students/import.csv`
- `GET /schedule`
- `POST /schedule/import.csv`
- `POST /reports/attendance-summary/generate`
- `GET /reports/attendance-summary`
- `GET /reports/attendance-matrix.csv`

## Troubleshooting

If the extension shows backend offline:

1. Make sure the backend is running.
2. Open `http://127.0.0.1:8000/health`.
3. Reload the extension in `chrome://extensions/`.

If no participants are detected:

1. Make sure you are using Zoom Web, not the desktop app.
2. Open the Zoom `Participants` panel.
3. Keep the panel visible.
4. Click `Force Send Now` in the extension popup.
