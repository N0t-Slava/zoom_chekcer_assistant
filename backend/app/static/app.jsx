const { useCallback, useEffect, useMemo, useState } = React;

const MAX_ATTENDANCE = 30;
const REFRESH_INTERVAL_MS = 5000;

const pages = [
  { id: "menu", label: "Dashboard" },
  { id: "meetings", label: "Meetings" },
  { id: "live-attendance", label: "Teacher Meeting" },
  { id: "students", label: "Students" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" }
];

const pageTitles = Object.fromEntries(pages.map((page) => [page.id, page.label]));

const tones = {
  success: "border-green-200 bg-green-50 text-success",
  warning: "border-yellow-300 bg-yellow-50 text-warning",
  danger: "border-red-200 bg-red-50 text-danger",
  neutral: "border-line bg-[#FFFDF7] text-muted"
};

const buttonBase =
  "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-sm font-black transition hover:-translate-y-px disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = `${buttonBase} border-[#D9C300] bg-accent text-ink`;
const secondaryButton = `${buttonBase} border-line bg-panel text-ink`;
const dangerButton = `${buttonBase} border-red-200 bg-danger text-white`;
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

function Card({ children, className = "" }) {
  return <article className={cx(cardClass, className)}>{children}</article>;
}

function CardHeader({ title, meta, children }) {
  return (
    <div className={cardHeaderClass}>
      <div className="min-w-0">
        <h2 className="m-0 text-xl font-black">{title}</h2>
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

function StatusTile({ label, value, tone = "neutral", wide = false }) {
  return (
    <div className={cx("rounded-lg border border-line bg-[#FFFDF7] p-3", wide && "sm:col-span-2")}>
      <div className="text-[11px] font-black uppercase text-muted">{label}</div>
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

function Shell({ page, setPage, zoomConnected, children }) {
  function go(nextPage) {
    if (nextPage === "live-attendance") {
      window.location.href = "/teacher-meeting";
      return;
    }
    setPage(nextPage);
    window.location.hash = nextPage;
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
                "min-h-11 rounded-lg border px-3 text-left text-sm font-black transition",
                page === item.id
                  ? "border-[#D9C300] bg-yellow-100 text-ink"
                  : "border-transparent text-muted hover:bg-panel hover:text-ink"
              )}
              type="button"
              onClick={() => go(item.id)}>
              {item.label}
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
            {zoomConnected ? "Zoom connected" : "Zoom checking"}
          </span>
          <a
            className="font-black underline decoration-accent decoration-4 underline-offset-4"
            href="/teacher-meeting">
            Open teacher meeting
          </a>
        </div>
      </aside>
      <main className="grid content-start gap-5 bg-canvas px-8 py-7 pb-12">{children}</main>
    </div>
  );
}

function Header({ page, refreshData }) {
  return (
    <header className="flex items-end justify-between gap-5">
      <div>
        <h1 className="text-5xl font-black leading-none">{pageTitles[page] || "Dashboard"}</h1>
      </div>
      <div className="flex items-end gap-3">
        <button className={primaryButton} type="button" onClick={refreshData}>
          Refresh
        </button>
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
      <CardHeader title="Attendance Analytics">
        <div className="flex flex-wrap gap-2">
          {["present", "absent", "unmatched", "meetings"].map((filter) => (
            <button
              key={filter}
              className={cx(
                "min-h-8 rounded-full border px-3 text-xs font-black capitalize",
                trendFilter === filter
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-panel text-muted"
              )}
              type="button"
              onClick={() => setTrendFilter(filter)}>
              {filter}
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
      </td>
      <td className={tdClass}>
        <button
          className={secondaryButton}
          type="button"
          disabled={!studentId}
          onClick={() => createAlias(Number(studentId), record.participant_name)}>
          Create alias / Link
        </button>
      </td>
    </tr>
  );
}

function MenuPage(props) {
  const { meetings, students, historyRecords, trendFilter, setTrendFilter } = props;

  return (
    <section className="grid gap-5">
      <AttendanceTrend
        records={historyRecords}
        meetings={meetings}
        trendFilter={trendFilter}
        setTrendFilter={setTrendFilter}
      />
      <MiniStats meetings={meetings} students={students} records={historyRecords} />
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
          <input
            className={cx(inputClass, "w-64")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search meetings"
          />
          <select
            className={cx(inputClass, "w-52")}
            value={mode}
            onChange={(event) => setMode(event.target.value)}>
            <option value="all">All meetings</option>
            <option value="host">Host meetings</option>
            <option value="participant">Participant meetings</option>
            <option value="recent">Recently used</option>
          </select>
        </div>
        <button className={secondaryButton} type="button" onClick={refreshData}>
          Refresh
        </button>
      </div>

      <Card>
        <CardHeader title="Save Meeting" />
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
            <select
              className={inputClass}
              value={draft.join_as_host ? "host" : "participant"}
              onChange={(event) =>
                setDraft({ ...draft, join_as_host: event.target.value === "host" })
              }>
              <option value="host">Host</option>
              <option value="participant">Participant</option>
            </select>
          </label>
          <button className={primaryButton} type="submit">
            Save
          </button>
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
      <CardHeader
        title="Saved Meetings"
        meta={`${meetings.length} saved meeting${meetings.length === 1 ? "" : "s"} visible.`}>
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
                      <a className={secondaryButton} href={meetingJoinUrl(meeting)}>
                        Join
                      </a>
                      <button
                        className={secondaryButton}
                        type="button"
                        onClick={() => setDraft(meeting)}>
                        Edit
                      </button>
                      <button
                        className={secondaryButton}
                        type="button"
                        onClick={() => checkSavedMeeting(meeting.meeting_number)}>
                        Check
                      </button>
                      <button
                        className={dangerButton}
                        type="button"
                        onClick={() => deleteSavedMeeting(meeting.id)}>
                        Delete
                      </button>
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
      <CardHeader title="Tracked Meeting Sessions">
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
        <button
          className={secondaryButton}
          type="button"
          onClick={() => updateMeeting(meeting.id, title, groupName)}>
          Save
        </button>
        <button
          className={secondaryButton}
          type="button"
          disabled={Boolean(meeting.ended_at)}
          onClick={() => closeMeeting(meeting.id)}>
          Close
        </button>
        <a
          className={secondaryButton}
          href={`/attendance/export.csv?meeting_session_id=${meeting.id}`}>
          CSV
        </a>
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
  createAlias
}) {
  const currentMeeting = activeMeeting(meetings);
  const lastSync = lastActivityTime(currentRecords, unmatchedRecords, historyRecords);

  return (
    <section className="grid gap-5">
      <div className="grid grid-cols-[minmax(220px,0.75fr)_minmax(320px,1.35fr)_minmax(260px,0.9fr)] items-start gap-5">
        <Card>
          <CardHeader
            title="Meeting Control"
            meta="Host console and saved meeting controls for the current lesson."
          />
          <div className="grid gap-3 p-5">
            <a className={primaryButton} href="/teacher-meeting">
              Open join console
            </a>
            <button
              className={secondaryButton}
              type="button"
              onClick={() => {
                window.location.hash = "meetings";
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              }}>
              Manage saved meetings
            </button>
            <div className="grid grid-cols-2 gap-2">
              <StatusTile
                label="Sync"
                value={currentMeeting ? "Active" : "Idle"}
                tone={currentMeeting ? "success" : "neutral"}
              />
              <StatusTile label="Last sync" value={formatShortDate(lastSync)} />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Participants / Matched Students"
            meta="Current active Zoom names from the attendance sync.">
            <Badge>{currentRecords.length}</Badge>
          </CardHeader>
          <ParticipantsTable records={currentRecords} />
        </Card>
        <Card>
          <CardHeader title="Unmatched Names" meta="Quick alias actions for unresolved Zoom names.">
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
      <CardHeader title={title}>
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
        <button className={primaryButton} type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
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

  return (
    <Card>
      <CardHeader title={title} meta={status}>
        <Badge tone={googleConfig?.configured ? "success" : "warning"}>
          {googleConfig?.configured ? "Bot ready" : "Bot missing"}
        </Badge>
      </CardHeader>
      <div className="grid gap-4 p-5">
        <label className={labelClass}>
          Bot email
          <input
            className={inputClass}
            value={botEmail || "Bot email is not configured"}
            readOnly
          />
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
          <button className={primaryButton} type="submit" disabled={!googleConfig?.configured}>
            Load tabs
          </button>
        </form>
        {tabs.length ? (
          <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
            <label className={labelClass}>
              Sheet tab
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
            </label>
            <button className={secondaryButton} type="button" onClick={previewSheet}>
              Preview
            </button>
            <label className="inline-flex items-center gap-2 pb-2 text-sm font-bold text-muted">
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
                      <button className={secondaryButton} type="button" onClick={() => syncSource(source.id)}>
                        Sync now
                      </button>
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
          <input
            className={cx(inputClass, "w-72")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students or aliases"
          />
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Add Student" />
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
            <button className={primaryButton} type="submit">
              Create
            </button>
          </form>
        </Card>
        <Card>
          <CardHeader title="Import Students" meta={status} />
          <form
            className="grid grid-cols-[1fr_auto_auto] items-end gap-3 p-5"
            onSubmit={submitImportPreview}>
            <label className={labelClass}>
              CSV or Excel file
              <input
                className="block w-full rounded-lg border border-dashed border-line bg-[#FFFDF7] p-2 text-sm"
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setPreview(null);
                  setMapping({});
                }}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-bold text-muted">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
              />{" "}
              Replace
            </label>
            <button className={primaryButton} type="submit">
              Preview
            </button>
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
        <CardHeader
          title="Student Roster"
          meta={`${filtered.length} visible student${filtered.length === 1 ? "" : "s"}.`}>
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
          <button className={secondaryButton} type="submit">
            Add alias
          </button>
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
        <StatusTile label="Total sessions" value={filteredSummaries.length} />
        <StatusTile
          label="Average attendance"
          value={`${average}%`}
          tone={average >= 70 ? "success" : "warning"}
        />
        <StatusTile
          label="Absences"
          value={filteredSummaries.filter((summary) => summary.status !== "п").length}
          tone="warning"
        />
        <StatusTile
          label="Attendance rows"
          value={Math.min(historyRecords.length, MAX_ATTENDANCE)}
        />
      </div>
      <div className="flex items-end justify-between gap-3 rounded-lg border border-line bg-panel p-3 shadow-soft">
        <div className="flex gap-3">
          <label className={labelClass}>
            Start date
            <input
              className={inputClass}
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            End date
            <input
              className={inputClass}
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            Group
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
          </label>
          <label className={labelClass}>
            Meeting ID
            <input
              className={inputClass}
              value={filters.meetingId}
              onChange={(event) => setFilters({ ...filters, meetingId: event.target.value })}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <a className={secondaryButton} href={`/attendance/export.csv${exportQuery}`}>
            Attendance CSV
          </a>
          <a className={secondaryButton} href="/reports/attendance-matrix.csv">
            Matrix CSV
          </a>
          <button className={primaryButton} type="button" onClick={submitSummary}>
            Generate Journal
          </button>
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
      <CardHeader title="Attendance Journal">
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
            <CardHeader title="Zoom Integration">
              <Badge tone={oauthStatus?.authorized ? "success" : "warning"}>
                {oauthStatus?.authorized ? "Connected" : "Needs OAuth"}
              </Badge>
            </CardHeader>
            <div className="grid grid-cols-4 gap-3 p-5">
              <StatusTile
                label="OAuth"
                value={oauthStatus?.authorized ? "Connected" : "Not connected"}
                tone={oauthStatus?.authorized ? "success" : "warning"}
              />
              <StatusTile
                label="Account"
                value={oauthStatus?.display_name || oauthStatus?.email || "Unknown"}
              />
              <StatusTile
                label="SDK"
                value={sdkConfig?.configured ? "Configured" : "Missing credentials"}
                tone={sdkConfig?.configured ? "success" : "danger"}
              />
              <StatusTile
                label="ZAK"
                value={oauthStatus?.authorized ? "Available" : "Requires OAuth"}
              />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                className={primaryButton}
                type="button"
                onClick={() => {
                  window.location.href = "/zoom/oauth/start?prompt=login";
                }}>
                {oauthStatus?.authorized ? "Authorize different account" : "Authorize Zoom"}
              </button>
              {oauthStatus?.authorized ? (
                <button className={dangerButton} type="button" onClick={disconnectZoom}>
                  Disconnect Zoom
                </button>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Groups" />
            <div className="flex flex-wrap gap-2 p-5">
              {groups.length ? (
                groups.map((group) => <Badge key={group}>{group}</Badge>)
              ) : (
                <span className="text-sm text-muted">No groups imported yet.</span>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Schedule Import" meta={status} />
            <form
              className="grid grid-cols-[1fr_auto_auto] items-end gap-3 p-5"
              onSubmit={submitSchedulePreview}>
              <label className={labelClass}>
                Schedule CSV or Excel
                <input
                  className="block w-full rounded-lg border border-dashed border-line bg-[#FFFDF7] p-2 text-sm"
                  type="file"
                  accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setPreview(null);
                    setMapping({});
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-bold text-muted">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(event) => setReplaceExisting(event.target.checked)}
                />{" "}
                Replace
              </label>
              <button className={primaryButton} type="submit">
                Preview
              </button>
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
    createAlias
  };

  return (
    <Shell page={page} setPage={setPage} zoomConnected={Boolean(data.oauthStatus?.authorized)}>
      <Header page={page} refreshData={refreshData} />
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
