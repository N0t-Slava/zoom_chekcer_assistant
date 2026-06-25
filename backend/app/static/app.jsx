const { useCallback, useEffect, useMemo, useState } = React;

const MAX_ATTENDANCE = 30;
const REFRESH_INTERVAL_MS = 5000;

const pages = [
  { id: "menu", label: "Dashboard", icon: "layout-dashboard" },
  { id: "live-attendance", label: "Current Lesson", icon: "video" },
  { id: "meetings", label: "Meetings", icon: "calendar-days" },
  { id: "students", label: "Students", icon: "users" },
  { id: "reports", label: "Reports", icon: "bar-chart-3" },
  { id: "settings", label: "Settings", icon: "settings" }
];

const pageTitles = Object.fromEntries(pages.map((page) => [page.id, page.label]));

const tones = {
  success: "border-green-200 bg-green-50 text-success",
  warning: "border-yellow-300 bg-yellow-50 text-warning",
  danger: "border-red-200 bg-red-50 text-danger",
  neutral: "border-line bg-[#FFFDF7] text-muted"
};

const buttonBase =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = `${buttonBase} border-[#D9C300] bg-accent text-ink`;
const secondaryButton = `${buttonBase} border-line bg-panel text-ink`;
const dangerButton = `${buttonBase} border-red-200 bg-red-50 text-danger`;
const successButton = `${buttonBase} border-green-200 bg-green-50 text-success`;
const compactButton = "min-h-8 px-2.5 text-xs";
const inputClass =
  "min-h-10 w-full rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-none focus:border-[#D9C300] focus:ring-4 focus:ring-yellow-200";
const labelClass = "grid gap-1 text-xs font-black uppercase text-muted";
const cardClass = "overflow-hidden rounded-lg border border-line bg-panel shadow-soft";
const cardHeaderClass = "flex items-start justify-between gap-3 border-b border-line px-5 py-4";
const tableWrapClass = "overflow-x-auto";
const tableClass = "min-w-full border-separate border-spacing-0 text-sm";
const thClass =
  "border-b border-line bg-[#F2EFE3] px-3 py-3 text-left text-[11px] font-black uppercase text-muted whitespace-nowrap";
const tdClass = "border-b border-line px-3 py-3 align-middle whitespace-nowrap";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

const iconShapes = {
  "layout-dashboard": [
    { tag: "rect", x: "3", y: "3", width: "7", height: "7", rx: "1" },
    { tag: "rect", x: "14", y: "3", width: "7", height: "7", rx: "1" },
    { tag: "rect", x: "14", y: "14", width: "7", height: "7", rx: "1" },
    { tag: "rect", x: "3", y: "14", width: "7", height: "7", rx: "1" }
  ],
  video: [
    { tag: "path", d: "m16 13 5 3V8l-5 3Z" },
    { tag: "rect", x: "3", y: "6", width: "13", height: "12", rx: "2" }
  ],
  "calendar-days": [
    { tag: "path", d: "M8 2v4M16 2v4M3 10h18" },
    { tag: "rect", x: "3", y: "4", width: "18", height: "18", rx: "2" },
    { tag: "path", d: "M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" }
  ],
  calendar: [
    { tag: "path", d: "M8 2v4M16 2v4M3 10h18" },
    { tag: "rect", x: "3", y: "4", width: "18", height: "18", rx: "2" }
  ],
  users: [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" }
  ],
  "bar-chart-3": [
    { tag: "path", d: "M3 3v18h18M18 17V9M13 17V5M8 17v-3" }
  ],
  settings: [
    { tag: "circle", cx: "12", cy: "12", r: "3" },
    { tag: "path", d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1v.2a2 2 0 0 1-4 0V21a1.65 1.65 0 0 0-.4-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.4h-.2a2 2 0 0 1 0-4H3a1.65 1.65 0 0 0 1-.4 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .4-1v-.2a2 2 0 0 1 4 0V3a1.65 1.65 0 0 0 .4 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1 .4h.2a2 2 0 0 1 0 4H21a1.65 1.65 0 0 0-1 .4 1.65 1.65 0 0 0-.6 1Z" }
  ],
  "refresh-cw": [
    { tag: "path", d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" },
    { tag: "path", d: "M3 21v-5h5M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" },
    { tag: "path", d: "M16 8h5V3" }
  ],
  "log-in": [
    { tag: "path", d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" },
    { tag: "path", d: "m10 17 5-5-5-5M15 12H3" }
  ],
  "play-circle": [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "m10 8 6 4-6 4Z" }
  ],
  "user-check": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "m16 11 2 2 4-4" }
  ],
  "user-x": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "m17 8 5 5M22 8l-5 5" }
  ],
  "user-search": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "circle", cx: "18", cy: "11", r: "3" },
    { tag: "path", d: "m20.5 13.5 1.5 1.5" }
  ],
  "user-plus": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "M19 8v6M22 11h-6" }
  ],
  "user-cog": [
    { tag: "path", d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "circle", cx: "19", cy: "11", r: "2" },
    { tag: "path", d: "M19 7v1M19 14v1M15.5 9l.9.5M21.6 12.5l.9.5M15.5 13l.9-.5M21.6 9.5l.9-.5" }
  ],
  user: [
    { tag: "path", d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "12", cy: "7", r: "4" }
  ],
  "link-2": [
    { tag: "path", d: "M9 17H7A5 5 0 0 1 7 7h2" },
    { tag: "path", d: "M15 7h2a5 5 0 1 1 0 10h-2" },
    { tag: "path", d: "M8 12h8" }
  ],
  save: [
    { tag: "path", d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" },
    { tag: "path", d: "M17 21v-8H7v8M7 3v5h8" }
  ],
  "trash-2": [
    { tag: "path", d: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" }
  ],
  pencil: [
    { tag: "path", d: "M17 3a2.85 2.85 0 0 1 4 4L7 21l-4 1 1-4Z" },
    { tag: "path", d: "m15 5 4 4" }
  ],
  "shield-check": [
    { tag: "path", d: "M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z" },
    { tag: "path", d: "m9 12 2 2 4-4" }
  ],
  "x-circle": [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "m15 9-6 6M9 9l6 6" }
  ],
  download: [
    { tag: "path", d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" },
    { tag: "path", d: "M7 10l5 5 5-5M12 15V3" }
  ],
  upload: [
    { tag: "path", d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" },
    { tag: "path", d: "M17 8 12 3 7 8M12 3v12" }
  ],
  "folder-open": [
    { tag: "path", d: "M6 14 4 20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-1.5L22 10H8l-2 4Z" },
    { tag: "path", d: "M2 10V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2" }
  ],
  eye: [
    { tag: "path", d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" },
    { tag: "circle", cx: "12", cy: "12", r: "3" }
  ],
  "check-circle-2": [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "m9 12 2 2 4-4" }
  ],
  replace: [
    { tag: "path", d: "M14 4h6v6M20 4l-8 8" },
    { tag: "path", d: "M10 20H4v-6M4 20l8-8" }
  ],
  "table-2": [
    { tag: "rect", x: "3", y: "4", width: "18", height: "16", rx: "2" },
    { tag: "path", d: "M3 10h18M10 4v16" }
  ],
  "chevron-down": [
    { tag: "path", d: "m6 9 6 6 6-6" }
  ],
  "toggle-right": [
    { tag: "rect", x: "2", y: "6", width: "20", height: "12", rx: "6" },
    { tag: "circle", cx: "16", cy: "12", r: "2" }
  ],
  copy: [
    { tag: "rect", x: "9", y: "9", width: "13", height: "13", rx: "2" },
    { tag: "path", d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }
  ],
  "file-down": [
    { tag: "path", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" },
    { tag: "path", d: "M14 2v6h6M12 18v-6M9 15l3 3 3-3" }
  ],
  search: [
    { tag: "circle", cx: "11", cy: "11", r: "8" },
    { tag: "path", d: "m21 21-4.3-4.3" }
  ],
  "list-filter": [
    { tag: "path", d: "M3 6h18M7 12h10M10 18h4" }
  ],
  "filter-x": [
    { tag: "path", d: "M3 4h18l-7 8v6l-4 2v-8Z" },
    { tag: "path", d: "m17 17 4 4M21 17l-4 4" }
  ],
  hash: [
    { tag: "path", d: "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" }
  ],
  "file-spreadsheet": [
    { tag: "path", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" },
    { tag: "path", d: "M14 2v6h6M8 13h8M8 17h8M11 9v12" }
  ],
  "clipboard-list": [
    { tag: "rect", x: "8", y: "2", width: "8", height: "4", rx: "1" },
    { tag: "path", d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M8 12h8M8 16h8" }
  ],
  unplug: [
    { tag: "path", d: "m19 5-3 3M22 2l-3 3M2 22l7-7M9 15l4 4a4 4 0 0 0 6-6l-4-4" },
    { tag: "path", d: "M10 10 6 6M14 6l-4 4" }
  ],
  "code-2": [
    { tag: "path", d: "m18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16" }
  ],
  "key-round": [
    { tag: "circle", cx: "8", cy: "15", r: "4" },
    { tag: "path", d: "M10.8 12.2 21 2M18 5l2 2M15 8l2 2" }
  ],
  info: [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "M12 16v-4M12 8h.01" }
  ],
  clock: [
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "M12 6v6l4 2" }
  ]
};

function Icon({ name, size = 18, className = "" }) {
  const shapes = iconShapes[name] || iconShapes.info;
  return (
    <svg
      aria-hidden="true"
      className={cx("shrink-0", className)}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}>
      {shapes.map((shape, index) => {
        const { tag = "path", ...attrs } = shape;
        return React.createElement(tag, { key: index, ...attrs });
      })}
    </svg>
  );
}

function actionClass(variant, compact, className) {
  return cx(
    variant === "primary" && primaryButton,
    variant === "danger" && dangerButton,
    variant === "success" && successButton,
    (!variant || variant === "secondary") && secondaryButton,
    compact && compactButton,
    className
  );
}

function ActionButton({
  as = "button",
  variant = "secondary",
  icon,
  iconSize,
  compact = false,
  className = "",
  children,
  type = "button",
  ...props
}) {
  const content = (
    <React.Fragment>
      {icon ? <Icon name={icon} size={iconSize || (compact ? 16 : 18)} /> : null}
      <span className="truncate">{children}</span>
    </React.Fragment>
  );
  if (as === "a") {
    return (
      <a className={actionClass(variant, compact, className)} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button className={actionClass(variant, compact, className)} type={type} {...props}>
      {content}
    </button>
  );
}

function FieldWithIcon({ icon, children }) {
  return (
    <span className="relative block">
      <Icon
        name={icon}
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      {React.cloneElement(children, {
        className: cx(children.props.className, "pl-9")
      })}
    </span>
  );
}

function FileControl({ file, onChange, accept, label = "Choose file" }) {
  return (
    <span className={cx(secondaryButton, "relative w-full justify-start border-dashed bg-[#FFFDF7]")}>
      <Icon name="upload" size={18} />
      <span className="truncate">{file?.name || label}</span>
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept={accept}
        onChange={onChange}
      />
    </span>
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${response.status} ${details || response.statusText}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function safeFetch(url, fallback, options = {}) {
  try {
    return await fetchJson(url, options);
  } catch (error) {
    console.error(`Unable to load ${url}`, error);
    return fallback;
  }
}

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function formatShortDate(value) {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Never"
    : date.toLocaleString([], {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
}

function formatDuration(totalSeconds = 0) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function participantKey(name) {
  return normalize(name);
}

function studentKeys(student) {
  return [student.full_name, ...(student.aliases || [])].map(normalize).filter(Boolean);
}

function matchStudent(students, participantName, groupName = "") {
  const key = participantKey(participantName);
  if (!key) {
    return null;
  }
  const groupStudents = groupName
    ? students.filter((student) => student.group_name === groupName)
    : students;
  return (
    groupStudents.find((student) => studentKeys(student).includes(key)) ||
    students.find((student) => studentKeys(student).includes(key)) ||
    null
  );
}

function suggestStudent(students, record) {
  const key = participantKey(record.participant_name);
  const candidates = record.group_name
    ? students.filter((student) => student.group_name === record.group_name)
    : students;
  if (!key || !candidates.length) {
    return null;
  }
  const words = new Set(key.split(" ").filter((part) => part.length > 2));
  let best = null;
  let bestScore = 0;
  for (const student of candidates) {
    const score = studentKeys(student).reduce((total, studentKey) => {
      if (studentKey === key) {
        return total + 100;
      }
      if (studentKey.includes(key) || key.includes(studentKey)) {
        return total + 20;
      }
      return total + studentKey.split(" ").filter((part) => words.has(part)).length;
    }, 0);
    if (score > bestScore) {
      best = student;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function activeMeeting(meetings) {
  return meetings.find((meeting) => !meeting.ended_at) || null;
}

function meetingDisplayName(meeting) {
  if (!meeting) {
    return "No active meeting";
  }
  return meeting.title || meeting.zoom_meeting_id || `Session #${meeting.id}`;
}

function lastActivityTime(currentRecords, unmatchedRecords, historyRecords) {
  const dates = [...currentRecords, ...unmatchedRecords, ...historyRecords]
    .map((record) => new Date(record.last_seen))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!dates.length) {
    return null;
  }
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function uniqueGroups(students) {
  return [...new Set(students.map((student) => student.group_name).filter(Boolean))].sort();
}

function historyLimit(records) {
  return records.slice(0, MAX_ATTENDANCE);
}

function Badge({ children, tone = "neutral" }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-7 items-center justify-center rounded-lg border px-2.5 text-xs font-black",
        tones[tone] || tones.neutral
      )}>
      {children}
    </span>
  );
}

function zoomAccountLabel(oauthStatus) {
  return (
    oauthStatus?.email ||
    oauthStatus?.display_name ||
    oauthStatus?.user_id ||
    ""
  );
}

function ZoomStatusPill({ oauthStatus, onManageSettings, showManage = true }) {
  const checking = !oauthStatus;
  const connected = Boolean(oauthStatus?.authorized);
  const account = zoomAccountLabel(oauthStatus);
  const label = checking
    ? "Zoom checking"
    : connected
      ? account
        ? `Zoom connected \u00b7 ${account}`
        : "Zoom connected"
      : "Zoom not connected";

  return (
    <div
      className={cx(
        "inline-flex min-h-9 max-w-[380px] items-center gap-2 rounded-lg border px-3 text-sm font-black shadow-soft",
        connected
          ? "border-green-200 bg-panel text-ink"
          : "border-yellow-300 bg-yellow-50 text-warning"
      )}>
      <span
        className={cx("h-2.5 w-2.5 shrink-0 rounded-full", connected ? "bg-success" : "bg-warning")}
      />
      <span className="truncate">{label}</span>
      {connected && showManage ? (
        <button
          className="inline-flex shrink-0 items-center gap-1 border-l border-line pl-2 text-xs font-black underline decoration-accent decoration-2 underline-offset-2"
          type="button"
          onClick={onManageSettings}>
          <Icon name="settings" size={14} />
          Manage
        </button>
      ) : null}
      {!connected && !checking ? (
        <a
          className="inline-flex shrink-0 items-center gap-1 border-l border-yellow-300 pl-2 text-xs font-black underline decoration-accent decoration-2 underline-offset-2"
          href="/zoom/oauth/start?prompt=login">
          <Icon name="log-in" size={14} />
          Connect
        </a>
      ) : null}
    </div>
  );
}

function currentLessonStatus({ oauthStatus, sdkConfig, meetings, currentRecords, unmatchedRecords }) {
  if (!oauthStatus) {
    return { label: "Ready", tone: "neutral" };
  }
  if (sdkConfig?.configured === false || !oauthStatus.authorized) {
    return { label: "Error", tone: "danger" };
  }
  if (activeMeeting(meetings) || currentRecords?.length || unmatchedRecords?.length) {
    return { label: "Syncing", tone: "success" };
  }
  if (sdkConfig?.configured) {
    return { label: "Ready", tone: "success" };
  }
  return { label: "Connected", tone: "neutral" };
}

function Card({ children, className = "" }) {
  return <article className={cx(cardClass, className)}>{children}</article>;
}

function CardHeader({ title, meta, icon, children }) {
  return (
    <div className={cardHeaderClass}>
      <div className="min-w-0">
        <h2 className="m-0 inline-flex items-center gap-2 text-xl font-black">
          {icon ? <Icon name={icon} size={20} /> : null}
          <span>{title}</span>
        </h2>
        {meta ? <p className="mt-1 text-sm leading-6 text-muted">{meta}</p> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td
        className="border-b border-line px-3 py-3 text-sm italic leading-6 text-muted whitespace-normal"
        colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

function StatusTile({ label, value, tone = "neutral", wide = false, icon }) {
  return (
    <div className={cx("rounded-lg border border-line bg-[#FFFDF7] p-3", wide && "sm:col-span-2")}>
      <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase text-muted">
        {icon ? <Icon name={icon} size={16} /> : null}
        <span>{label}</span>
      </div>
      <div
        className={cx(
          "mt-2 truncate text-base font-black",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
          tone === "neutral" && "text-ink"
        )}>
        {value}
      </div>
    </div>
  );
}

function Shell({ page, goToPage, oauthStatus, children }) {
  const checkingZoom = !oauthStatus;
  const zoomConnected = Boolean(oauthStatus?.authorized);
  const zoomLabel = checkingZoom
    ? "Zoom checking"
    : zoomConnected
      ? "Zoom connected"
      : "Zoom not connected";

  function go(nextPage) {
    goToPage(nextPage);
  }

  return (
    <div className="grid min-h-screen min-w-[1040px] grid-cols-[268px_minmax(760px,1fr)]">
      <aside className="sticky top-0 flex h-screen flex-col gap-5 overflow-y-auto border-r border-line bg-[#FFFDF7] px-4 py-5">
        <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line bg-panel p-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-black">
            T
          </span>
          <span className="min-w-0">
            <strong className="block truncate font-black">Teacher console</strong>
            <small className="block truncate text-xs font-bold text-muted">
              Roster and live sync
            </small>
          </span>
        </div>

        <nav className="grid gap-2" aria-label="Primary navigation">
          {pages.map((item) => (
            <button
              key={item.id}
              className={cx(
                "inline-flex min-h-11 items-center gap-3 rounded-lg border px-3 text-left text-sm font-black transition",
                page === item.id
                  ? "border-[#D9C300] bg-yellow-100 text-ink"
                  : "border-transparent text-muted hover:bg-panel hover:text-ink"
              )}
              type="button"
              onClick={() => go(item.id)}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto grid gap-2 border-t border-line pt-4 text-sm font-black">
          <span className="inline-flex items-center gap-2 text-muted">
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                zoomConnected ? "bg-success" : "bg-warning"
              )}
            />
            {zoomLabel}
          </span>
          <a
            className="inline-flex items-center gap-2 font-black underline decoration-accent decoration-4 underline-offset-4"
            href="/#live-attendance">
            <Icon name="video" size={16} />
            Open current lesson
          </a>
        </div>
      </aside>
      <main className="grid content-start gap-5 bg-canvas px-8 py-7 pb-12">{children}</main>
    </div>
  );
}

function Header({
  page,
  refreshData,
  oauthStatus,
  sdkConfig,
  meetings,
  currentRecords,
  unmatchedRecords,
  goToPage
}) {
  const isDashboard = page === "menu";
  const isCurrentLesson = page === "live-attendance";
  const lessonStatus = currentLessonStatus({
    oauthStatus,
    sdkConfig,
    meetings,
    currentRecords,
    unmatchedRecords
  });

  return (
    <header className="flex items-center justify-between gap-5">
      <div>
        <h1 className="text-5xl font-black leading-none">{pageTitles[page] || "Dashboard"}</h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ZoomStatusPill
          oauthStatus={oauthStatus}
          showManage={page !== "settings"}
          onManageSettings={() => goToPage("settings")}
        />
        {isCurrentLesson ? <Badge tone={lessonStatus.tone}>{lessonStatus.label}</Badge> : null}
        {!isCurrentLesson ? (
          <ActionButton icon="refresh-cw" onClick={refreshData}>
            Refresh
          </ActionButton>
        ) : null}
        {isDashboard ? (
          <ActionButton icon="play-circle" variant="primary" onClick={() => goToPage("live-attendance")}>
            Start / Join lesson
          </ActionButton>
        ) : null}
      </div>
    </header>
  );
}

function trendDates() {
  const dates = [];
  const today = new Date();
  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  return dates;
}

function sameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function AttendanceTrend({ records, meetings, trendFilter, setTrendFilter }) {
  const filters = [
    { key: "present", label: "Present", icon: "user-check" },
    { key: "absent", label: "Absent", icon: "user-x" },
    { key: "unmatched", label: "Needs review", icon: "user-search" },
    { key: "meetings", label: "Lessons", icon: "calendar-days" }
  ];
  const points = useMemo(() => {
    const days = trendDates();
    return days.map((day) => {
      const recordsForDay = records.filter((record) => sameDay(new Date(record.first_seen), day));
      const meetingsForDay = meetings.filter((meeting) =>
        sameDay(new Date(meeting.started_at), day)
      );
      const value =
        trendFilter === "meetings"
          ? meetingsForDay.length
          : trendFilter === "absent"
            ? recordsForDay.filter((record) => record.status !== "active").length
            : trendFilter === "unmatched"
              ? recordsForDay.filter((record) => !record.meeting_session_id).length
              : recordsForDay.filter((record) => record.status === "active").length;
      return {
        label: day.toLocaleDateString([], { weekday: "short" }),
        value
      };
    });
  }, [records, meetings, trendFilter]);
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <Card>
      <CardHeader title="Attendance Analytics" icon="bar-chart-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              className={cx(
                "inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-black",
                trendFilter === filter.key
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-panel text-muted"
              )}
              type="button"
              onClick={() => setTrendFilter(filter.key)}>
              <Icon name={filter.icon} size={16} />
              {filter.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <div className="grid gap-3 p-5">
        <div className="grid min-h-56 grid-cols-7 items-end gap-2 rounded-lg border border-line bg-white p-4">
          {points.map((point) => (
            <div key={point.label} className="grid h-full min-w-0 content-end gap-2">
              <strong className="text-center text-sm font-black">{point.value}</strong>
              <div
                className={cx(
                  "min-h-1.5 rounded-t-md",
                  trendFilter === "absent"
                    ? "bg-danger"
                    : trendFilter === "unmatched"
                      ? "bg-warning"
                      : trendFilter === "meetings"
                        ? "bg-ink"
                        : "bg-success"
                )}
                style={{ height: `${Math.max(6, (point.value / max) * 160)}px` }}
              />
              <span className="text-center text-xs font-black text-muted">{point.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MiniStats({ meetings, students, records }) {
  const stats = [
    ["Total meetings", meetings.length],
    ["Tracked sessions", meetings.filter((meeting) => !meeting.ended_at).length || meetings.length],
    ["Total students", students.length],
    ["Attendance records", Math.min(records.length, MAX_ATTENDANCE)]
  ];
  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-line bg-[#FFFDF7] p-4">
          <span className="text-xs font-black uppercase text-muted">{label}</span>
          <strong className="mt-3 block text-3xl font-black">{value}</strong>
        </div>
      ))}
    </div>
  );
}

function UnmatchedTable({ records, students, createAlias }) {
  const rows = records.slice(0, MAX_ATTENDANCE);
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr>
            {["Zoom name", "Suggested student", "Action"].map((head) => (
              <th key={head} className={thClass}>
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((record) => {
              const groupStudents = record.group_name
                ? students.filter((student) => student.group_name === record.group_name)
                : students;
              const suggested = suggestStudent(students, record);
              return (
                <AliasRow
                  key={`${record.meeting_session_id || record.meeting_id}-${record.participant_name}`}
                  record={record}
                  students={groupStudents}
                  suggested={suggested}
                  createAlias={createAlias}
                />
              );
            })
          ) : (
            <EmptyRow colSpan={3}>All active participants match the selected roster.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AliasRow({ record, students, suggested, createAlias }) {
  const [studentId, setStudentId] = useState(String(suggested?.id || students[0]?.id || ""));
  useEffect(() => {
    setStudentId(String(suggested?.id || students[0]?.id || ""));
  }, [record.participant_name, suggested?.id, students.length]);

  return (
    <tr>
      <td className={tdClass}>{record.participant_name}</td>
      <td className={tdClass}>
        <FieldWithIcon icon="user-check">
          <select
            className={cx(inputClass, "min-w-40")}
            value={studentId}
            disabled={!students.length}
            onChange={(event) => setStudentId(event.target.value)}>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name} ({student.group_name})
              </option>
            ))}
          </select>
        </FieldWithIcon>
      </td>
      <td className={tdClass}>
        <ActionButton
          compact
          icon="link-2"
          disabled={!studentId}
          onClick={() => createAlias(Number(studentId), record.participant_name)}>
          Create alias / Link
        </ActionButton>
      </td>
    </tr>
  );
}

function DashboardStep({ index, title, detail, done, actionLabel, href, onAction, icon }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#FFFDF7] p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cx(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-black",
            done
              ? "border-green-200 bg-green-50 text-success"
              : "border-line bg-panel text-muted"
          )}>
          {done ? "OK" : index}
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-black">{title}</strong>
          <span className="mt-1 block text-sm leading-5 text-muted">{detail}</span>
        </span>
      </div>
      {done ? (
        <Badge tone="success">Done</Badge>
      ) : href ? (
        <ActionButton as="a" compact icon={icon} href={href}>
          {actionLabel}
        </ActionButton>
      ) : (
        <ActionButton compact icon={icon} onClick={onAction}>
          {actionLabel}
        </ActionButton>
      )}
    </div>
  );
}

function DashboardChecklist({ oauthStatus, students, savedMeetings, meetings, historyRecords, goToPage }) {
  const zoomConnected = Boolean(oauthStatus?.authorized);
  const active = activeMeeting(meetings);
  const account = zoomAccountLabel(oauthStatus);
  const steps = [
    {
      title: "Connect Zoom",
      detail: zoomConnected
        ? account
          ? `Connected as ${account}.`
          : "Your Zoom account is connected."
        : "Connect Zoom so host join and live sync are available.",
      done: zoomConnected,
      actionLabel: "Connect",
      href: "/zoom/oauth/start?prompt=login",
      icon: "log-in"
    },
    {
      title: "Import students",
      detail: "Add students manually, import a file, or connect a Google Sheet.",
      done: students.length > 0,
      actionLabel: "Students",
      onAction: () => goToPage("students"),
      icon: "users"
    },
    {
      title: "Save or select a meeting",
      detail: "Keep recurring Zoom meetings ready for lesson setup.",
      done: savedMeetings.length > 0 || Boolean(active),
      actionLabel: "Meetings",
      onAction: () => goToPage("meetings"),
      icon: "calendar-days"
    },
    {
      title: "Start current lesson",
      detail: "Open Current Lesson to join Zoom and begin attendance sync.",
      done: Boolean(active),
      actionLabel: "Open",
      onAction: () => goToPage("live-attendance"),
      icon: "video"
    },
    {
      title: "Generate report",
      detail: "Review synced attendance and generate journals after lessons.",
      done: historyRecords.length > 0,
      actionLabel: "Reports",
      onAction: () => goToPage("reports"),
      icon: "bar-chart-3"
    }
  ];

  return (
    <Card>
      <CardHeader title="Setup checklist" icon="check-circle-2" />
      <div className="grid gap-3 p-5">
        {steps.map((step, index) => (
          <DashboardStep key={step.title} index={index + 1} {...step} />
        ))}
      </div>
    </Card>
  );
}

function DashboardLessonCard({ meetings, historyRecords, goToPage }) {
  const active = activeMeeting(meetings);
  const lastSync = lastActivityTime([], [], historyRecords);

  return (
    <Card>
      <CardHeader title="Current lesson" icon="video">
        <Badge tone={active ? "success" : "neutral"}>{active ? "Syncing" : "Not started"}</Badge>
      </CardHeader>
      <div className="grid gap-4 p-5">
        <div className="grid gap-3">
          <StatusTile
            label="Lesson"
            value={meetingDisplayName(active)}
            tone={active ? "success" : "neutral"}
            icon="video"
            wide
          />
          <StatusTile label="Last sync" value={formatShortDate(lastSync)} icon="clock" wide />
        </div>
        <ActionButton icon="play-circle" variant="primary" onClick={() => goToPage("live-attendance")}>
          Start / Join lesson
        </ActionButton>
      </div>
    </Card>
  );
}

function MenuPage(props) {
  const {
    meetings,
    savedMeetings,
    students,
    historyRecords,
    oauthStatus,
    trendFilter,
    setTrendFilter,
    goToPage
  } = props;

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] items-start gap-5">
        <DashboardChecklist
          oauthStatus={oauthStatus}
          students={students}
          savedMeetings={savedMeetings}
          meetings={meetings}
          historyRecords={historyRecords}
          goToPage={goToPage}
        />
        <DashboardLessonCard
          meetings={meetings}
          historyRecords={historyRecords}
          goToPage={goToPage}
        />
      </div>
      <MiniStats meetings={meetings} students={students} records={historyRecords} />
      <AttendanceTrend
        records={historyRecords}
        meetings={meetings}
        trendFilter={trendFilter}
        setTrendFilter={setTrendFilter}
      />
    </section>
  );
}

function MeetingsPage({
  meetings,
  savedMeetings,
  ownershipChecks,
  refreshData,
  saveSavedMeeting,
  deleteSavedMeeting,
  checkSavedMeeting,
  updateMeeting,
  closeMeeting
}) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("all");
  const [draft, setDraft] = useState({
    title: "",
    meeting_number: "",
    passcode: "",
    join_as_host: true
  });
  const filtered = savedMeetings
    .filter((meeting) => {
      const matchesSearch =
        !search ||
        normalize(`${meeting.title || ""} ${meeting.meeting_number}`).includes(normalize(search));
      const matchesMode =
        mode === "all" ||
        (mode === "host" && meeting.join_as_host) ||
        (mode === "participant" && !meeting.join_as_host) ||
        mode === "recent";
      return matchesSearch && matchesMode;
    })
    .slice(0, mode === "recent" ? 5 : savedMeetings.length);

  async function submitSavedMeeting(event) {
    event.preventDefault();
    await saveSavedMeeting(draft);
    setDraft({ title: "", meeting_number: "", passcode: "", join_as_host: true });
  }

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3 shadow-soft">
        <div className="flex gap-3">
          <FieldWithIcon icon="search">
            <input
              className={cx(inputClass, "w-64")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search meetings"
            />
          </FieldWithIcon>
          <FieldWithIcon icon="list-filter">
            <select
              className={cx(inputClass, "w-52")}
              value={mode}
              onChange={(event) => setMode(event.target.value)}>
              <option value="all">All meetings</option>
              <option value="host">Host meetings</option>
              <option value="participant">Participant meetings</option>
              <option value="recent">Recently used</option>
            </select>
          </FieldWithIcon>
        </div>
      </div>

      <Card>
        <CardHeader title="Save Meeting" icon="save" />
        <form
          className="grid grid-cols-[1fr_180px_160px_150px_auto] items-end gap-3 p-5"
          onSubmit={submitSavedMeeting}>
          <label className={labelClass}>
            Meeting name
            <input
              className={inputClass}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            Meeting ID
            <input
              className={inputClass}
              value={draft.meeting_number}
              onChange={(event) => setDraft({ ...draft, meeting_number: event.target.value })}
              required
            />
          </label>
          <label className={labelClass}>
            Passcode
            <input
              className={inputClass}
              value={draft.passcode}
              onChange={(event) => setDraft({ ...draft, passcode: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            Role
            <FieldWithIcon icon="chevron-down">
              <select
                className={inputClass}
                value={draft.join_as_host ? "host" : "participant"}
                onChange={(event) =>
                  setDraft({ ...draft, join_as_host: event.target.value === "host" })
                }>
                <option value="host">Host</option>
                <option value="participant">Participant</option>
              </select>
            </FieldWithIcon>
          </label>
          <ActionButton icon="save" variant="primary" type="submit">
            Save meeting
          </ActionButton>
        </form>
      </Card>

      <SavedMeetingsTable
        meetings={filtered}
        trackedMeetings={meetings}
        ownershipChecks={ownershipChecks}
        setDraft={setDraft}
        deleteSavedMeeting={deleteSavedMeeting}
        checkSavedMeeting={checkSavedMeeting}
      />
      <TrackedMeetingsTable
        meetings={meetings}
        updateMeeting={updateMeeting}
        closeMeeting={closeMeeting}
      />
    </section>
  );
}

function meetingJoinUrl(meeting) {
  const params = new URLSearchParams({
    meetingNumber: meeting.meeting_number,
    joinAsHost: meeting.join_as_host ? "1" : "0"
  });
  if (meeting.passcode) {
    params.set("passcode", meeting.passcode);
  }
  return `/teacher-meeting?${params.toString()}`;
}

function SavedMeetingsTable({
  meetings,
  trackedMeetings,
  ownershipChecks,
  setDraft,
  deleteSavedMeeting,
  checkSavedMeeting
}) {
  return (
    <Card>
      <CardHeader title="Saved Meetings" icon="calendar-days">
        <Badge>{meetings.length}</Badge>
      </CardHeader>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              {[
                "Meeting name",
                "Meeting ID",
                "Role",
                "Owner/access",
                "Last used",
                "Sync",
                "Actions"
              ].map((head) => (
                <th key={head} className={thClass}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meetings.length ? (
              meetings.map((meeting) => {
                const check = ownershipChecks[meeting.meeting_number];
                const tracked = trackedMeetings.find(
                  (item) => item.zoom_meeting_id === meeting.meeting_number
                );
                return (
                  <tr key={meeting.id}>
                    <td className={tdClass}>{meeting.title || "Untitled meeting"}</td>
                    <td className={tdClass}>{meeting.meeting_number}</td>
                    <td className={tdClass}>
                      <Badge tone={meeting.join_as_host ? "success" : "neutral"}>
                        {meeting.join_as_host ? "Host" : "Participant"}
                      </Badge>
                    </td>
                    <td className={tdClass}>
                      <Badge
                        tone={
                          !check
                            ? "neutral"
                            : !check.can_read
                              ? "danger"
                              : check.owner_matches_authorized_user
                                ? "success"
                                : "warning"
                        }>
                        {!check
                          ? "Not checked"
                          : !check.can_read
                            ? "No access"
                            : check.owner_matches_authorized_user
                              ? "Owner match"
                              : "Readable"}
                      </Badge>
                    </td>
                    <td className={tdClass}>{formatShortDate(meeting.updated_at)}</td>
                    <td className={tdClass}>
                      <Badge tone={tracked ? "success" : "neutral"}>
                        {tracked ? (tracked.ended_at ? "Tracked" : "Active") : "Idle"}
                      </Badge>
                    </td>
                    <td className={cx(tdClass, "space-x-2")}>
                      <ActionButton as="a" compact icon="video" href={meetingJoinUrl(meeting)}>
                        Join
                      </ActionButton>
                      <ActionButton
                        compact
                        icon="pencil"
                        onClick={() => setDraft(meeting)}>
                        Edit
                      </ActionButton>
                      <ActionButton
                        compact
                        icon="shield-check"
                        onClick={() => checkSavedMeeting(meeting.meeting_number)}>
                        Check
                      </ActionButton>
                      <ActionButton
                        compact
                        icon="trash-2"
                        variant="danger"
                        onClick={() => deleteSavedMeeting(meeting.id)}>
                        Delete
                      </ActionButton>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyRow colSpan={7}>No saved meetings match this view.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TrackedMeetingsTable({ meetings, updateMeeting, closeMeeting }) {
  const sortedMeetings = [...meetings].sort((left, right) => {
    const rawLeftTime = new Date(left.started_at || left.updated_at || 0).getTime();
    const rawRightTime = new Date(right.started_at || right.updated_at || 0).getTime();
    const leftTime = Number.isNaN(rawLeftTime) ? 0 : rawLeftTime;
    const rightTime = Number.isNaN(rawRightTime) ? 0 : rawRightTime;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return right.id - left.id;
  });
  const visibleMeetings = sortedMeetings.slice(0, 5);

  return (
    <Card>
      <CardHeader title="Tracked Meeting Sessions" icon="calendar-days">
        <Badge>{visibleMeetings.length}</Badge>
      </CardHeader>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              {[
                "Session",
                "Zoom ID",
                "Title",
                "Group",
                "Started",
                "Last sync",
                "Status",
                "Actions"
              ].map((head) => (
                <th key={head} className={thClass}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleMeetings.length ? (
              visibleMeetings.map((meeting) => (
                <TrackedMeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  updateMeeting={updateMeeting}
                  closeMeeting={closeMeeting}
                />
              ))
            ) : (
              <EmptyRow colSpan={8}>No tracked sessions yet.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TrackedMeetingRow({ meeting, updateMeeting, closeMeeting }) {
  const [title, setTitle] = useState(meeting.title || "");
  const [groupName, setGroupName] = useState(meeting.group_name || "");
  useEffect(() => {
    setTitle(meeting.title || "");
    setGroupName(meeting.group_name || "");
  }, [meeting.id, meeting.title, meeting.group_name]);

  return (
    <tr>
      <td className={tdClass}>#{meeting.id}</td>
      <td className={tdClass}>{meeting.zoom_meeting_id}</td>
      <td className={tdClass}>
        <input
          className={cx(inputClass, "min-w-48")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </td>
      <td className={tdClass}>
        <input
          className={cx(inputClass, "min-w-36")}
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
        />
      </td>
      <td className={tdClass}>{formatShortDate(meeting.started_at)}</td>
      <td className={tdClass}>
        {meeting.ended_at ? formatShortDate(meeting.ended_at) : "Syncing"}
      </td>
      <td className={tdClass}>
        <Badge tone={meeting.ended_at ? "neutral" : "success"}>
          {meeting.ended_at ? "Closed" : "Active"}
        </Badge>
      </td>
      <td className={cx(tdClass, "space-x-2")}>
        <ActionButton
          compact
          icon="save"
          onClick={() => updateMeeting(meeting.id, title, groupName)}>
          Save changes
        </ActionButton>
        <ActionButton
          compact
          icon="x-circle"
          variant="danger"
          disabled={Boolean(meeting.ended_at)}
          onClick={() => closeMeeting(meeting.id)}>
          Close session
        </ActionButton>
        <ActionButton
          as="a"
          compact
          icon="download"
          href={`/attendance/export.csv?meeting_session_id=${meeting.id}`}>
          Export CSV
        </ActionButton>
      </td>
    </tr>
  );
}

function LiveAttendancePage({
  currentRecords,
  unmatchedRecords,
  historyRecords,
  students,
  meetings,
  oauthStatus,
  sdkConfig,
  goToPage,
  createAlias
}) {
  const currentMeeting = activeMeeting(meetings);
  const lastSync = lastActivityTime(currentRecords, unmatchedRecords, historyRecords);
  const lessonState = currentLessonStatus({
    oauthStatus,
    sdkConfig,
    meetings,
    currentRecords,
    unmatchedRecords
  });
  const primaryLabel = currentMeeting ? "Join Zoom" : "Start lesson";

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-[minmax(220px,0.75fr)_minmax(320px,1.35fr)_minmax(260px,0.9fr)] items-start gap-5">
        <Card>
          <CardHeader title={primaryLabel} icon={currentMeeting ? "video" : "play-circle"} />
          <div className="grid gap-3 p-5">
            <ActionButton as="a" icon="video" variant="primary" href="/teacher-meeting">
              {primaryLabel}
            </ActionButton>
            <ActionButton
              icon="calendar-days"
              onClick={() => goToPage("meetings")}>
              Saved meetings
            </ActionButton>
            <div className="grid gap-2">
              <StatusTile
                label="Zoom"
                value={oauthStatus?.authorized ? "Connected" : "Not connected"}
                tone={oauthStatus?.authorized ? "success" : "warning"}
                icon="video"
              />
              <StatusTile
                label="Lesson"
                value={lessonState.label}
                tone={lessonState.tone}
                icon="users"
              />
              <StatusTile
                label="Sync"
                value={currentMeeting ? "Active" : "Idle"}
                tone={currentMeeting ? "success" : "neutral"}
                icon="refresh-cw"
              />
              <StatusTile label="Last sync" value={formatShortDate(lastSync)} icon="clock" />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Participants / Matched Students" icon="users">
            <Badge>{currentRecords.length}</Badge>
          </CardHeader>
          <ParticipantsTable records={currentRecords} />
        </Card>
        <Card>
          <CardHeader title="Unmatched Names" icon="user-search">
            <Badge tone={unmatchedRecords.length ? "warning" : "neutral"}>
              {unmatchedRecords.length}
            </Badge>
          </CardHeader>
          <UnmatchedTable
            records={unmatchedRecords}
            students={students}
            createAlias={createAlias}
          />
        </Card>
      </div>
      <HistoryTable title="Attendance Timeline" records={historyRecords} />
    </section>
  );
}

function ParticipantsTable({ records }) {
  const rows = records.slice(0, MAX_ATTENDANCE);
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr>
            {["Name", "Meeting", "Session", "Last seen", "Duration"].map((head) => (
              <th key={head} className={thClass}>
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((record) => (
              <tr key={`${record.id}-${record.participant_name}`}>
                <td className={tdClass}>{record.participant_name}</td>
                <td className={tdClass}>{record.meeting_id}</td>
                <td className={tdClass}>
                  {record.meeting_session_id ? `#${record.meeting_session_id}` : ""}
                </td>
                <td className={tdClass}>{formatShortDate(record.last_seen)}</td>
                <td className={tdClass}>{formatDuration(record.total_seconds)}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5}>No active participants yet.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ title = "Attendance History", records }) {
  const rows = historyLimit(records);
  return (
    <Card>
      <CardHeader title={title} icon="clock">
        <Badge>{rows.length}</Badge>
      </CardHeader>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              {["Name", "Meeting", "Session", "Status", "First seen", "Last seen", "Total"].map(
                (head) => (
                  <th key={head} className={thClass}>
                    {head}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((record) => (
                <tr key={`${record.id}-${record.first_seen}`}>
                  <td className={tdClass}>{record.participant_name}</td>
                  <td className={tdClass}>{record.meeting_id}</td>
                  <td className={tdClass}>
                    {record.meeting_session_id ? `#${record.meeting_session_id}` : ""}
                  </td>
                  <td
                    className={cx(
                      tdClass,
                      record.status === "active"
                        ? "font-black text-success"
                        : "font-black text-danger"
                    )}>
                    {record.status}
                  </td>
                  <td className={tdClass}>{formatShortDate(record.first_seen)}</td>
                  <td className={tdClass}>{formatShortDate(record.last_seen)}</td>
                  <td className={tdClass}>{formatDuration(record.total_seconds)}</td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={7}>No attendance history yet.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function formatImportSummary(result) {
  const aliasText =
    result.aliases_created_count || result.aliases_updated_count
      ? `, aliases created ${result.aliases_created_count || 0}, aliases updated ${result.aliases_updated_count || 0}`
      : "";
  const sheetText = result.sheets_write_errors?.length
    ? ` Sheet write failed: ${result.sheets_write_errors.join("; ")}`
    : result.sheets_written_count
      ? ` Wrote back to ${result.sheets_written_count} Sheet${result.sheets_written_count === 1 ? "" : "s"}.`
      : "";
  return `Imported ${result.imported_count}, created ${result.created_count}, updated ${result.updated_count}, skipped ${result.skipped_count}${aliasText}.${sheetText}`;
}

function formatSyncSummary(result) {
  return formatImportSummary(result?.result || result || {});
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.includes(",") ? value.split(",").pop() : value);
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function ImportPreviewPanel({ preview, mapping, setMapping, fields, onConfirm, confirmLabel }) {
  if (!preview) {
    return null;
  }
  const sampleHeaders = preview.headers || [];
  const sampleRows = preview.sample_rows || [];
  const confidence =
    typeof preview.confidence === "number" ? `${Math.round(preview.confidence * 100)}% confidence` : null;
  const metadata = [
    preview.table_type ? `Type: ${preview.table_type}` : null,
    preview.mapping_source ? `Mapping: ${preview.mapping_source}` : null,
    confidence
  ].filter(Boolean);
  return (
    <div className="grid gap-4 border-t border-line p-5">
      {metadata.length ? <div className="text-sm font-bold text-muted">{metadata.join(" / ")}</div> : null}
      <div className="grid grid-cols-3 gap-3">
        {fields.map((field) => (
          <label className={labelClass} key={field.key}>
            {field.label}
            <FieldWithIcon icon="list-filter">
              <select
                className={inputClass}
                value={mapping[field.key] || ""}
                onChange={(event) => setMapping({ ...mapping, [field.key]: event.target.value })}>
                <option value="">Not mapped</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </FieldWithIcon>
          </label>
        ))}
      </div>
      {preview.warnings?.length ? (
        <div className="grid gap-2">
          {preview.warnings.map((warning) => (
            <div key={warning} className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-bold text-warning">
              {warning}
            </div>
          ))}
        </div>
      ) : null}
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              {sampleHeaders.map((header) => (
                <th key={header} className={thClass}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleRows.length ? (
              sampleRows.map((row, index) => (
                <tr key={index}>
                  {sampleHeaders.map((header) => (
                    <td key={header} className={tdClass}>
                      {row[header] || ""}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={Math.max(1, sampleHeaders.length)}>No rows detected.</EmptyRow>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-muted">
          {preview.total_rows} rows detected. Confirm mapping before saving.
        </span>
        <ActionButton
          icon={confirmLabel === "Save connection" ? "link-2" : "check-circle-2"}
          variant="success"
          onClick={onConfirm}>
          {confirmLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function GoogleSheetImportPanel({
  title,
  importKind,
  fields,
  googleConfig,
  sources,
  importHistory,
  loadGoogleSheetTabs,
  previewGoogleSheetImport,
  saveGoogleSheetSource,
  syncGoogleSheetSource
}) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [tabs, setTabs] = useState([]);
  const [selectedTab, setSelectedTab] = useState("");
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [status, setStatus] = useState("Share the sheet with the bot as Editor, then paste the URL.");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const botEmail = googleConfig?.bot_email || googleConfig?.service_account_email || "";
  const historyRows = (importHistory || []).filter((run) => run.import_kind === importKind).slice(0, 5);

  async function loadTabs(event) {
    event.preventDefault();
    setStatus("Reading sheet tabs...");
    setPreview(null);
    setMapping({});
    const result = await loadGoogleSheetTabs(sheetUrl);
    setTabs(result.tabs || []);
    setSelectedTab((result.tabs || [])[0] || "");
    setStatus(result.tabs?.length ? "Choose a tab and preview mapping." : "No tabs found.");
  }

  async function previewSheet() {
    if (!sheetUrl || !selectedTab) {
      setStatus("Paste a Sheet URL and choose a tab first.");
      return;
    }
    setStatus("Reading sample rows...");
    const result = await previewGoogleSheetImport(sheetUrl, selectedTab, importKind);
    setPreview(result.preview);
    setMapping(result.preview?.suggested_mapping || {});
    setStatus(`Preview ready: ${result.preview?.total_rows || 0} rows detected.`);
  }

  async function saveSource() {
    if (!preview || !selectedTab) {
      setStatus("Preview and confirm mapping before saving.");
      return;
    }
    setStatus("Saving Google Sheet connection...");
    await saveGoogleSheetSource(importKind, sheetUrl, selectedTab, mapping, preview, autoSyncEnabled);
    setStatus("Google Sheet connection saved.");
  }

  async function syncSource(sourceId) {
    setStatus("Syncing Google Sheet...");
    const result = await syncGoogleSheetSource(sourceId, replaceExisting);
    setStatus(formatSyncSummary(result));
  }

  async function copyBotEmail() {
    if (!botEmail) {
      return;
    }
    await navigator.clipboard?.writeText(botEmail);
    setStatus("Bot email copied.");
  }

  return (
    <Card>
      <CardHeader title={title} meta={status} icon="table-2">
        <Badge tone={googleConfig?.configured ? "success" : "warning"}>
          {googleConfig?.configured ? "Bot ready" : "Bot missing"}
        </Badge>
      </CardHeader>
      <div className="grid gap-4 p-5">
        <label className={labelClass}>
          Bot email
          <span className="grid grid-cols-[1fr_auto] gap-2">
            <input
              className={inputClass}
              value={botEmail || "Bot email is not configured"}
              readOnly
            />
            <ActionButton icon="copy" disabled={!botEmail} onClick={copyBotEmail}>
              Copy
            </ActionButton>
          </span>
        </label>
        <form className="grid grid-cols-[1fr_auto] items-end gap-3" onSubmit={loadTabs}>
          <label className={labelClass}>
            Google Sheet URL
            <input
              className={inputClass}
              value={sheetUrl}
              onChange={(event) => {
                setSheetUrl(event.target.value);
                setTabs([]);
                setSelectedTab("");
                setPreview(null);
                setMapping({});
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </label>
          <ActionButton
            icon="table-2"
            variant="primary"
            type="submit"
            disabled={!googleConfig?.configured}>
            Load tabs
          </ActionButton>
        </form>
        {tabs.length ? (
          <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
            <label className={labelClass}>
              Sheet tab
              <FieldWithIcon icon="chevron-down">
                <select
                  className={inputClass}
                  value={selectedTab}
                  onChange={(event) => {
                    setSelectedTab(event.target.value);
                    setPreview(null);
                    setMapping({});
                  }}>
                  {tabs.map((tab) => (
                    <option key={tab} value={tab}>
                      {tab}
                    </option>
                  ))}
                </select>
              </FieldWithIcon>
            </label>
            <ActionButton icon="eye" onClick={previewSheet}>
              Preview
            </ActionButton>
            <label className="inline-flex items-center gap-2 pb-2 text-sm font-bold text-muted">
              <Icon name="toggle-right" size={16} />
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(event) => setAutoSyncEnabled(event.target.checked)}
              />{" "}
              Auto-sync
            </label>
          </div>
        ) : null}
      </div>
      <ImportPreviewPanel
        preview={preview}
        mapping={mapping}
        setMapping={setMapping}
        fields={fields}
        onConfirm={saveSource}
        confirmLabel="Save connection"
      />
      <div className="grid gap-3 border-t border-line p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-black text-ink">Saved Google Sheets</span>
          <label className="inline-flex items-center gap-2 text-sm font-bold text-muted">
            <Icon name="replace" size={16} />
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(event) => setReplaceExisting(event.target.checked)}
            />{" "}
            Replace on sync
          </label>
        </div>
        {sources?.length ? (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  {["Tab", "Type", "Auto", "Last sync", ""].map((head) => (
                    <th key={head} className={thClass}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td className={tdClass}>{source.selected_tab}</td>
                    <td className={tdClass}>{source.table_type}</td>
                    <td className={tdClass}>{source.auto_sync_enabled ? "On" : "Off"}</td>
                    <td className={tdClass}>
                      {source.last_synced_at ? formatShortDate(source.last_synced_at) : "Never"}
                    </td>
                    <td className={tdClass}>
                      <ActionButton compact icon="refresh-cw" onClick={() => syncSource(source.id)}>
                        Sync now
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <span className="text-sm text-muted">No saved Google Sheet connection yet.</span>
        )}
        {historyRows.length ? (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  {["When", "Source", "Status", "Rows", "Imported", "Skipped"].map((head) => (
                    <th key={head} className={thClass}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map((run) => (
                  <tr key={run.id}>
                    <td className={tdClass}>{formatShortDate(run.finished_at || run.started_at)}</td>
                    <td className={tdClass}>{run.source_type}</td>
                    <td className={tdClass}>{run.status}</td>
                    <td className={tdClass}>{run.row_count}</td>
                    <td className={tdClass}>{run.imported_count}</td>
                    <td className={tdClass}>{run.skipped_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function StudentsPage({
  students,
  currentRecords,
  createStudent,
  previewStudentsImport,
  commitStudentsImport,
  googleConfig,
  googleStudentSources,
  importHistory,
  loadGoogleSheetTabs,
  previewGoogleSheetImport,
  saveGoogleSheetSource,
  syncGoogleSheetSource,
  createAlias
}) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [newStudent, setNewStudent] = useState({ full_name: "", group_name: "" });
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [status, setStatus] = useState("Import a roster or add students manually.");
  const groups = uniqueGroups(students);
  const filtered = students.filter((student) => {
    const aliases = (student.aliases || []).join(" ");
    const haystack = normalize(`${student.full_name} ${student.group_name} ${aliases}`);
    return (
      (!group || student.group_name === group) && (!search || haystack.includes(normalize(search)))
    );
  });

  async function submitStudent(event) {
    event.preventDefault();
    await createStudent(newStudent.full_name, newStudent.group_name);
    setNewStudent({ full_name: "", group_name: "" });
  }

  async function submitImportPreview(event) {
    event.preventDefault();
    if (!file) {
      setStatus("Choose a CSV or XLSX file first.");
      return;
    }
    setStatus("Reading file...");
    const nextPreview = await previewStudentsImport(file);
    setPreview(nextPreview);
    setMapping(nextPreview.suggested_mapping || {});
    setStatus(`Preview ready: ${nextPreview.total_rows} rows detected.`);
  }

  async function confirmImport() {
    if (!file || !preview) {
      return;
    }
    setStatus("Importing...");
    const result = await commitStudentsImport(file, mapping, replaceExisting, preview);
    setStatus(formatImportSummary(result));
    setFile(null);
    setPreview(null);
    setMapping({});
  }

  return (
    <section className="grid gap-5">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel p-3 shadow-soft">
        <div className="flex gap-3">
          <FieldWithIcon icon="search">
            <input
              className={cx(inputClass, "w-72")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search students or aliases"
            />
          </FieldWithIcon>
          <FieldWithIcon icon="list-filter">
            <select
              className={cx(inputClass, "w-52")}
              value={group}
              onChange={(event) => setGroup(event.target.value)}>
              <option value="">All groups</option>
              {groups.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FieldWithIcon>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Add Student" icon="user-plus" />
          <form
            className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 p-5"
            onSubmit={submitStudent}>
            <label className={labelClass}>
              Student name
              <input
                className={inputClass}
                value={newStudent.full_name}
                onChange={(event) =>
                  setNewStudent({ ...newStudent, full_name: event.target.value })
                }
                required
              />
            </label>
            <label className={labelClass}>
              Group
              <input
                className={inputClass}
                value={newStudent.group_name}
                onChange={(event) =>
                  setNewStudent({ ...newStudent, group_name: event.target.value })
                }
                required
              />
            </label>
            <ActionButton icon="user-plus" variant="primary" type="submit">
              Add student
            </ActionButton>
          </form>
        </Card>
        <Card>
          <CardHeader title="Import Students" meta={status} icon="upload" />
          <form
            className="grid grid-cols-[1fr_auto_auto] items-end gap-3 p-5"
            onSubmit={submitImportPreview}>
            <label className={labelClass}>
              CSV or Excel file
              <FileControl
                file={file}
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setPreview(null);
                  setMapping({});
                }}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-bold text-muted">
              <Icon name="replace" size={16} />
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
              />{" "}
              Replace
            </label>
            <ActionButton icon="eye" variant="primary" type="submit">
              Preview
            </ActionButton>
          </form>
          <ImportPreviewPanel
            preview={preview}
            mapping={mapping}
            setMapping={setMapping}
            fields={[
              { key: "full_name", label: "Student name" },
              { key: "group_name", label: "Group" },
              { key: "aliases", label: "Aliases / Zoom names" }
            ]}
            onConfirm={confirmImport}
            confirmLabel="Confirm import"
          />
        </Card>
      </div>

      <GoogleSheetImportPanel
        title="Google Sheet Students"
        importKind="students"
        googleConfig={googleConfig}
        sources={googleStudentSources}
        importHistory={importHistory}
        loadGoogleSheetTabs={loadGoogleSheetTabs}
        previewGoogleSheetImport={previewGoogleSheetImport}
        saveGoogleSheetSource={saveGoogleSheetSource}
        syncGoogleSheetSource={syncGoogleSheetSource}
        fields={[
          { key: "full_name", label: "Student name" },
          { key: "group_name", label: "Group" },
          { key: "aliases", label: "Aliases / Zoom names" }
        ]}
      />

      <Card>
        <CardHeader title="Student Roster" icon="users">
          <Badge>{filtered.length}</Badge>
        </CardHeader>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                {["Student name", "Group", "Aliases", "Attendance status", "Actions"].map(
                  (head) => (
                    <th key={head} className={thClass}>
                      {head}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((student) => {
                  const present = currentRecords.some((record) =>
                    studentKeys(student).includes(normalize(record.participant_name))
                  );
                  return (
                    <StudentRow
                      key={student.id}
                      student={student}
                      present={present}
                      createAlias={createAlias}
                    />
                  );
                })
              ) : (
                <EmptyRow colSpan={5}>No students match this view.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function StudentRow({ student, present, createAlias }) {
  const [alias, setAlias] = useState("");
  async function submitAlias(event) {
    event.preventDefault();
    if (!alias.trim()) {
      return;
    }
    await createAlias(student.id, alias.trim());
    setAlias("");
  }

  return (
    <tr>
      <td className={tdClass}>{student.full_name}</td>
      <td className={tdClass}>{student.group_name}</td>
      <td className={tdClass}>{(student.aliases || []).join(", ") || "None"}</td>
      <td className={cx(tdClass, present ? "font-black text-success" : "text-muted")}>
        {present ? "Present" : "Not active"}
      </td>
      <td className={tdClass}>
        <form className="flex gap-2" onSubmit={submitAlias}>
          <input
            className={cx(inputClass, "min-w-48")}
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Zoom display name"
          />
          <ActionButton compact icon="user-plus" type="submit">
            Add alias
          </ActionButton>
        </form>
      </td>
    </tr>
  );
}

function ReportsPage({ summaries, historyRecords, students, generateSummary }) {
  const [filters, setFilters] = useState({ from: "", to: "", group: "", meetingId: "" });
  const [status, setStatus] = useState("");
  const groups = uniqueGroups(students);
  const filteredSummaries = summaries.filter((summary) => {
    const startsAt = new Date(summary.lesson_starts_at);
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59`) : null;
    const dateMatches =
      Number.isNaN(startsAt.getTime()) || ((!from || startsAt >= from) && (!to || startsAt <= to));
    return (!filters.group || summary.group_name === filters.group) && dateMatches;
  });
  const average = filteredSummaries.length
    ? Math.round(
        (filteredSummaries.filter((summary) => summary.status === "п").length /
          filteredSummaries.length) *
          100
      )
    : 0;
  const exportQuery = filters.meetingId
    ? `?meeting_id=${encodeURIComponent(filters.meetingId)}`
    : "";

  async function submitSummary() {
    setStatus("Generating...");
    const result = await generateSummary();
    const sheetStatus = result.sheets_write_errors?.length
      ? ` Sheet write failed: ${result.sheets_write_errors.join("; ")}`
      : result.sheets_written_count
        ? ` Wrote back to ${result.sheets_written_count} Sheet${result.sheets_written_count === 1 ? "" : "s"}.`
        : "";
    setStatus(
      `Generated ${result.generated_count}: ${result.present_count} present, ${result.absent_count} absent.${sheetStatus}`
    );
  }

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-4 gap-3">
        <StatusTile label="Total sessions" value={filteredSummaries.length} icon="calendar-days" />
        <StatusTile
          label="Average attendance"
          value={`${average}%`}
          tone={average >= 70 ? "success" : "warning"}
          icon="user-check"
        />
        <StatusTile
          label="Absences"
          value={filteredSummaries.filter((summary) => summary.status !== "п").length}
          tone="warning"
          icon="user-x"
        />
        <StatusTile
          label="Attendance rows"
          value={Math.min(historyRecords.length, MAX_ATTENDANCE)}
          icon="clock"
        />
      </div>
      <div className="grid gap-3 rounded-lg border border-line bg-panel p-3 shadow-soft">
        <div className="grid grid-cols-[150px_150px_minmax(160px,1fr)_minmax(140px,0.8fr)] gap-3">
          <label className={labelClass}>
            Start date
            <FieldWithIcon icon="calendar">
              <input
                className={inputClass}
                type="date"
                value={filters.from}
                onChange={(event) => setFilters({ ...filters, from: event.target.value })}
              />
            </FieldWithIcon>
          </label>
          <label className={labelClass}>
            End date
            <FieldWithIcon icon="calendar">
              <input
                className={inputClass}
                type="date"
                value={filters.to}
                onChange={(event) => setFilters({ ...filters, to: event.target.value })}
              />
            </FieldWithIcon>
          </label>
          <label className={labelClass}>
            Group
            <FieldWithIcon icon="list-filter">
              <select
                className={cx(inputClass, "w-52")}
                value={filters.group}
                onChange={(event) => setFilters({ ...filters, group: event.target.value })}>
                <option value="">All groups</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </FieldWithIcon>
          </label>
          <label className={labelClass}>
            Meeting ID
            <FieldWithIcon icon="hash">
              <input
                className={inputClass}
                value={filters.meetingId}
                onChange={(event) => setFilters({ ...filters, meetingId: event.target.value })}
              />
            </FieldWithIcon>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ActionButton as="a" icon="download" href={`/attendance/export.csv${exportQuery}`}>
            Export attendance CSV
          </ActionButton>
          <ActionButton as="a" icon="file-spreadsheet" href="/reports/attendance-matrix.csv">
            Export matrix CSV
          </ActionButton>
          <ActionButton icon="clipboard-list" variant="primary" onClick={submitSummary}>
            Generate attendance journal
          </ActionButton>
        </div>
      </div>
      {status ? <p className="text-sm font-bold text-muted">{status}</p> : null}
      <SummaryTable summaries={filteredSummaries} />
      <HistoryTable records={historyRecords} />
    </section>
  );
}

function SummaryTable({ summaries }) {
  return (
    <Card>
      <CardHeader title="Attendance Journal" icon="clipboard-list">
        <Badge>{summaries.length}</Badge>
      </CardHeader>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr>
              {["Student", "Group", "Lesson", "Start", "Status", "Total"].map((head) => (
                <th key={head} className={thClass}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.length ? (
              summaries.map((summary) => (
                <tr key={summary.id}>
                  <td className={tdClass}>{summary.student_name}</td>
                  <td className={tdClass}>{summary.group_name}</td>
                  <td className={tdClass}>{summary.lesson_title || ""}</td>
                  <td className={tdClass}>{formatShortDate(summary.lesson_starts_at)}</td>
                  <td
                    className={cx(
                      tdClass,
                      summary.status === "п" ? "font-black text-success" : "font-black text-danger"
                    )}>
                    {summary.status}
                  </td>
                  <td className={tdClass}>{formatDuration(summary.total_seconds)}</td>
                </tr>
              ))
            ) : (
              <EmptyRow colSpan={6}>
                Waiting for scheduled attendance updates, or generate the journal manually.
              </EmptyRow>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SettingsPage({
  oauthStatus,
  sdkConfig,
  students,
  schedule,
  previewScheduleImport,
  commitScheduleImport,
  googleConfig,
  googleScheduleSources,
  importHistory,
  loadGoogleSheetTabs,
  previewGoogleSheetImport,
  saveGoogleSheetSource,
  syncGoogleSheetSource,
  disconnectZoom
}) {
  const [file, setFile] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [status, setStatus] = useState("Import schedule CSV for attendance journals.");
  const groups = uniqueGroups(students);

  async function submitSchedulePreview(event) {
    event.preventDefault();
    if (!file) {
      setStatus("Choose a CSV or XLSX file first.");
      return;
    }
    setStatus("Reading file...");
    const nextPreview = await previewScheduleImport(file);
    setPreview(nextPreview);
    setMapping(nextPreview.suggested_mapping || {});
    setStatus(`Preview ready: ${nextPreview.total_rows} rows detected.`);
  }

  async function confirmScheduleImport() {
    if (!file || !preview) {
      return;
    }
    setStatus("Importing...");
    const result = await commitScheduleImport(file, mapping, replaceExisting, preview);
    setStatus(formatImportSummary(result));
    setFile(null);
    setPreview(null);
    setMapping({});
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-5">
          <Card>
            <CardHeader title="Zoom Integration" icon="settings">
              <Badge tone={oauthStatus?.authorized ? "success" : "warning"}>
                {oauthStatus?.authorized ? "Connected" : "Needs OAuth"}
              </Badge>
            </CardHeader>
            <div className="grid grid-cols-4 gap-3 p-5">
              <StatusTile
                label="OAuth"
                value={oauthStatus?.authorized ? "Connected" : "Not connected"}
                tone={oauthStatus?.authorized ? "success" : "warning"}
                icon="video"
              />
              <StatusTile
                label="Account"
                value={oauthStatus?.display_name || oauthStatus?.email || "Unknown"}
                icon="user"
              />
              <StatusTile
                label="SDK"
                value={sdkConfig?.configured ? "Configured" : "Missing credentials"}
                tone={sdkConfig?.configured ? "success" : "danger"}
                icon="code-2"
              />
              <StatusTile
                label="ZAK"
                value={oauthStatus?.authorized ? "Available" : "Requires OAuth"}
                icon="key-round"
              />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <ActionButton
                icon={oauthStatus?.authorized ? "user-cog" : "log-in"}
                variant="primary"
                onClick={() => {
                  window.location.href = "/zoom/oauth/start?prompt=login";
                }}>
                {oauthStatus?.authorized ? "Authorize different account" : "Authorize Zoom"}
              </ActionButton>
              {oauthStatus?.authorized ? (
                <ActionButton icon="unplug" variant="danger" onClick={disconnectZoom}>
                  Disconnect Zoom
                </ActionButton>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Groups" icon="users" />
            <div className="flex flex-wrap gap-2 p-5">
              {groups.length ? (
                groups.map((group) => <Badge key={group}>{group}</Badge>)
              ) : (
                <span className="text-sm text-muted">No groups imported yet.</span>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Schedule Import" meta={status} icon="upload" />
            <form
              className="grid grid-cols-[1fr_auto_auto] items-end gap-3 p-5"
              onSubmit={submitSchedulePreview}>
              <label className={labelClass}>
                Schedule CSV or Excel
                <FileControl
                  file={file}
                  accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setPreview(null);
                    setMapping({});
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-bold text-muted">
                <Icon name="replace" size={16} />
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                />{" "}
                Replace
              </label>
              <ActionButton icon="eye" variant="primary" type="submit">
                Preview
              </ActionButton>
            </form>
            <ImportPreviewPanel
              preview={preview}
              mapping={mapping}
              setMapping={setMapping}
              fields={[
                { key: "date", label: "Lesson date" },
                { key: "start_time", label: "Start time" },
                { key: "end_time", label: "End time" },
                { key: "group_name", label: "Group" },
                { key: "title", label: "Title" }
              ]}
              onConfirm={confirmScheduleImport}
              confirmLabel="Confirm schedule import"
            />
            <ScheduleTable entries={schedule} />
          </Card>

          <GoogleSheetImportPanel
            title="Google Sheet Schedule"
            importKind="schedule"
            googleConfig={googleConfig}
            sources={googleScheduleSources}
            importHistory={importHistory}
            loadGoogleSheetTabs={loadGoogleSheetTabs}
            previewGoogleSheetImport={previewGoogleSheetImport}
            saveGoogleSheetSource={saveGoogleSheetSource}
            syncGoogleSheetSource={syncGoogleSheetSource}
            fields={[
              { key: "date", label: "Lesson date" },
              { key: "start_time", label: "Start time" },
              { key: "end_time", label: "End time" },
              { key: "group_name", label: "Group" },
              { key: "title", label: "Title" }
            ]}
          />
      </div>
    </section>
  );
}

function ScheduleTable({ entries }) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr>
            {["Title", "Group", "Starts", "Ends"].map((head) => (
              <th key={head} className={thClass}>
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.length ? (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td className={tdClass}>{entry.title || ""}</td>
                <td className={tdClass}>{entry.group_name}</td>
                <td className={tdClass}>{formatShortDate(entry.starts_at)}</td>
                <td className={tdClass}>{formatShortDate(entry.ends_at)}</td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={4}>No schedule imported yet.</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const initialPage = window.location.hash.replace("#", "") || "menu";
  const [page, setPage] = useState(
    pages.some((item) => item.id === initialPage) ? initialPage : "menu"
  );
  const [trendFilter, setTrendFilter] = useState("present");
  const [data, setData] = useState({
    summaries: [],
    schedule: [],
    students: [],
    meetings: [],
    savedMeetings: [],
    currentRecords: [],
    unmatchedRecords: [],
    historyRecords: [],
    oauthStatus: null,
    sdkConfig: null,
    googleConfig: null,
    googleStudentSources: [],
    googleScheduleSources: [],
    importHistory: [],
    ownershipChecks: {}
  });

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "") || "menu";
      setPage(pages.some((item) => item.id === hash) ? hash : "menu");
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const goToPage = useCallback((nextPage) => {
    const validPage = pages.some((item) => item.id === nextPage) ? nextPage : "menu";
    setPage(validPage);
    window.location.hash = validPage;
  }, []);

  const buildAttendanceQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("limit", String(MAX_ATTENDANCE));
    return `?${params.toString()}`;
  }, []);

  const refreshData = useCallback(async () => {
    const query = buildAttendanceQuery();
    const [
      summaries,
      schedule,
      students,
      meetings,
      savedMeetings,
      currentRecords,
      unmatchedRecords,
      historyRecords,
      oauthStatus,
      sdkConfig,
      googleConfig,
      googleStudentSources,
      googleScheduleSources,
      importHistory
    ] = await Promise.all([
      safeFetch("/reports/attendance-summary", []),
      safeFetch("/schedule", []),
      safeFetch("/students", []),
      safeFetch("/meetings", []),
      safeFetch("/zoom/saved-meetings", []),
      safeFetch(`/attendance/current${query}`, []),
      safeFetch(`/attendance/unmatched${query}`, []),
      safeFetch(`/attendance/history${query}`, []),
      safeFetch("/zoom/oauth/status", null),
      safeFetch("/zoom/meeting-sdk/config", null),
      safeFetch("/google-sheets/config", null),
      safeFetch("/google-sheets/sources?import_kind=students", []),
      safeFetch("/google-sheets/sources?import_kind=schedule", []),
      safeFetch("/imports/history", [])
    ]);

    setData((previous) => ({
      ...previous,
      summaries,
      schedule,
      students,
      meetings,
      savedMeetings,
      currentRecords: currentRecords.slice(0, MAX_ATTENDANCE),
      unmatchedRecords: unmatchedRecords.slice(0, MAX_ATTENDANCE),
      historyRecords: historyRecords.slice(0, MAX_ATTENDANCE),
      oauthStatus,
      sdkConfig,
      googleConfig,
      googleStudentSources,
      googleScheduleSources,
      importHistory
    }));
  }, [buildAttendanceQuery]);

  useEffect(() => {
    refreshData();
    const timer = window.setInterval(refreshData, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  async function createAlias(studentId, aliasName) {
    await fetchJson("/students/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, alias_name: aliasName })
    });
    await fetch("/reports/attendance-summary/generate", { method: "POST" });
    await refreshData();
  }

  async function createStudent(fullName, groupName) {
    await fetchJson("/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName, group_name: groupName })
    });
    await refreshData();
  }

  async function importPreviewPayload(file, mapping = {}, replaceExisting = false, preview = null) {
    const payload = {
      file_name: file.name,
      file_content_base64: await fileToBase64(file),
      mapping,
      replace_existing: replaceExisting
    };
    if (preview) {
      payload.table_type = preview.table_type || null;
      payload.confidence = typeof preview.confidence === "number" ? preview.confidence : null;
      payload.warnings = preview.warnings || [];
    }
    return payload;
  }

  async function previewStudentsImport(file) {
    return fetchJson("/students/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file))
    });
  }

  async function commitStudentsImport(file, mapping, replaceExisting, preview = null) {
    const result = await fetchJson("/students/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file, mapping, replaceExisting, preview))
    });
    await refreshData();
    return result;
  }

  async function previewScheduleImport(file) {
    return fetchJson("/schedule/import/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file))
    });
  }

  async function commitScheduleImport(file, mapping, replaceExisting, preview = null) {
    const result = await fetchJson("/schedule/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await importPreviewPayload(file, mapping, replaceExisting, preview))
    });
    await refreshData();
    return result;
  }

  async function loadGoogleSheetTabs(sheetUrl) {
    return fetchJson("/google-sheets/tabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet_url: sheetUrl })
    });
  }

  async function previewGoogleSheetImport(sheetUrl, selectedTab, importKind) {
    return fetchJson("/google-sheets/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet_url: sheetUrl,
        selected_tab: selectedTab,
        import_kind: importKind
      })
    });
  }

  async function saveGoogleSheetSource(importKind, sheetUrl, selectedTab, mapping, preview, autoSyncEnabled = false) {
    const result = await fetchJson("/google-sheets/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet_url: sheetUrl,
        selected_tab: selectedTab,
        import_kind: importKind,
        mapping,
        headers: preview?.headers || [],
        table_type: preview?.table_type || importKind,
        confidence: typeof preview?.confidence === "number" ? preview.confidence : null,
        warnings: preview?.warnings || [],
        auto_sync_enabled: autoSyncEnabled
      })
    });
    await refreshData();
    return result;
  }

  async function syncGoogleSheetSource(sourceId, replaceExisting = false) {
    const result = await fetchJson(`/google-sheets/sources/${sourceId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replace_existing: replaceExisting })
    });
    await refreshData();
    return result;
  }

  async function generateSummary() {
    const result = await fetchJson("/reports/attendance-summary/generate", { method: "POST" });
    await refreshData();
    return result;
  }

  async function saveSavedMeeting(draft) {
    const meetingNumber = String(draft.meeting_number || "").replace(/\D+/g, "");
    if (!meetingNumber) {
      return;
    }
    await fetchJson("/zoom/saved-meetings", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_number: meetingNumber,
        title: draft.title || null,
        passcode: draft.passcode || null,
        join_as_host: Boolean(draft.join_as_host)
      })
    });
    await refreshData();
  }

  async function deleteSavedMeeting(meetingId) {
    await fetchJson(`/zoom/saved-meetings/${meetingId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    await refreshData();
  }

  async function checkSavedMeeting(meetingNumber) {
    const check = await fetchJson(`/zoom/meetings/${encodeURIComponent(meetingNumber)}/check`);
    setData((previous) => ({
      ...previous,
      ownershipChecks: {
        ...previous.ownershipChecks,
        [meetingNumber]: check
      }
    }));
  }

  async function updateMeeting(meetingId, title, groupName) {
    await fetchJson(`/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, group_name: groupName })
    });
    await refreshData();
  }

  async function closeMeeting(meetingId) {
    await fetchJson(`/meetings/${meetingId}/close`, { method: "POST" });
    await refreshData();
  }

  async function disconnectZoom() {
    await fetchJson("/zoom/oauth/disconnect", { method: "POST" });
    await refreshData();
  }

  const commonPageProps = {
    ...data,
    trendFilter,
    setTrendFilter,
    refreshData,
    goToPage,
    createAlias
  };

  return (
    <Shell page={page} goToPage={goToPage} oauthStatus={data.oauthStatus}>
      <Header
        page={page}
        refreshData={refreshData}
        oauthStatus={data.oauthStatus}
        sdkConfig={data.sdkConfig}
        meetings={data.meetings}
        currentRecords={data.currentRecords}
        unmatchedRecords={data.unmatchedRecords}
        goToPage={goToPage}
      />
      {page === "menu" ? <MenuPage {...commonPageProps} /> : null}
      {page === "meetings" ? (
        <MeetingsPage
          {...commonPageProps}
          saveSavedMeeting={saveSavedMeeting}
          deleteSavedMeeting={deleteSavedMeeting}
          checkSavedMeeting={checkSavedMeeting}
          updateMeeting={updateMeeting}
          closeMeeting={closeMeeting}
        />
      ) : null}
      {page === "live-attendance" ? <LiveAttendancePage {...commonPageProps} /> : null}
      {page === "students" ? (
        <StudentsPage
          students={data.students}
          currentRecords={data.currentRecords}
          createStudent={createStudent}
          previewStudentsImport={previewStudentsImport}
          commitStudentsImport={commitStudentsImport}
          googleConfig={data.googleConfig}
          googleStudentSources={data.googleStudentSources}
          importHistory={data.importHistory}
          loadGoogleSheetTabs={loadGoogleSheetTabs}
          previewGoogleSheetImport={previewGoogleSheetImport}
          saveGoogleSheetSource={saveGoogleSheetSource}
          syncGoogleSheetSource={syncGoogleSheetSource}
          createAlias={createAlias}
        />
      ) : null}
      {page === "reports" ? (
        <ReportsPage
          summaries={data.summaries}
          historyRecords={data.historyRecords}
          students={data.students}
          generateSummary={generateSummary}
        />
      ) : null}
      {page === "settings" ? (
        <SettingsPage
          oauthStatus={data.oauthStatus}
          sdkConfig={data.sdkConfig}
          students={data.students}
          schedule={data.schedule}
          previewScheduleImport={previewScheduleImport}
          commitScheduleImport={commitScheduleImport}
          googleConfig={data.googleConfig}
          googleScheduleSources={data.googleScheduleSources}
          importHistory={data.importHistory}
          loadGoogleSheetTabs={loadGoogleSheetTabs}
          previewGoogleSheetImport={previewGoogleSheetImport}
          saveGoogleSheetSource={saveGoogleSheetSource}
          syncGoogleSheetSource={syncGoogleSheetSource}
          disconnectZoom={disconnectZoom}
        />
      ) : null}
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
