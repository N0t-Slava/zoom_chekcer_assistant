console.log("Teacher meeting JS loaded v2026-06-22-control-center");

const savedMeetingSelect = document.querySelector("#saved-meeting-select");
const meetingTitleInput = document.querySelector("#meeting-title");
const meetingNumberInput = document.querySelector("#meeting-number");
const meetingPasswordInput = document.querySelector("#meeting-password");
const teacherNameInput = document.querySelector("#teacher-name");
const joinAsHostInput = document.querySelector("#join-as-host");
const joinButton = document.querySelector("#join-button");
const saveMeetingButton = document.querySelector("#save-meeting-button");
const deleteMeetingButton = document.querySelector("#delete-meeting-button");
const zoomLoginButton = document.querySelector("#zoom-login-button");
const zoomDisconnectButton = document.querySelector("#zoom-disconnect-button");
const zoomAccountStatus = document.querySelector("#zoom-account-status");
const sdkStatus = document.querySelector("#sdk-status");
const sdkMessage = document.querySelector("#sdk-message");
const oauthMessage = document.querySelector("#oauth-message");
const zoomUserMessage = document.querySelector("#zoom-user-message");
const meetingCheckMessage = document.querySelector("#meeting-check-message");
const attendanceMessage = document.querySelector("#attendance-message");
const savedMeetingsTable = document.querySelector("#saved-meetings-table");
const savedMeetingsCount = document.querySelector("#saved-meetings-count");
const savedMeetingsMessage = document.querySelector("#saved-meetings-message");
const sidebarLiveStatus = document.querySelector("#sidebar-live-status");
const liveParticipantCount = document.querySelector("#live-participant-count");
const liveParticipantList = document.querySelector("#live-participant-list");
const liveMatchedCount = document.querySelector("#live-matched-count");
const liveMatchedList = document.querySelector("#live-matched-list");
const liveUnmatchedCount = document.querySelector("#live-unmatched-count");
const liveUnmatchedList = document.querySelector("#live-unmatched-list");
const liveHistoryList = document.querySelector("#live-history-list");
const healthSdkStatus = document.querySelector("#health-sdk-status");
const healthJoinedStatus = document.querySelector("#health-joined-status");
const healthParticipantsStatus = document.querySelector("#health-participants-status");
const healthBackendStatus = document.querySelector("#health-backend-status");
const healthIntervalStatus = document.querySelector("#health-interval-status");
const liveLastSync = document.querySelector("#live-last-sync");

const ATTENDANCE_SYNC_INTERVAL_MS = 5000;

let sdkConfig = null;
let sdkScriptPromise = null;
let oauthAuthorized = false;
let attendanceSyncTimer = null;
let currentMeetingNumber = null;
let participantCache = new Map();
let savedMeetings = [];
let lastAttendanceSyncLog = null;
let teacherClientJoined = false;
let zoomAccountDisplayName = "";

function zoomAccountName(status) {
  return (status?.display_name || status?.email || status?.user_id || "").trim();
}

function currentTeacherName() {
  return (zoomAccountDisplayName || teacherNameInput.value.trim() || "Teacher").trim();
}

function syncTeacherNameWithZoom(status) {
  const accountName = zoomAccountName(status);
  zoomAccountDisplayName = accountName;
  if (!accountName || !teacherNameInput) {
    return;
  }

  const currentName = teacherNameInput.value.trim();
  if (!currentName || currentName === "Teacher" || currentName === zoomAccountDisplayName) {
    teacherNameInput.value = accountName;
  }
}

function setLiveText(target, value) {
  if (target) {
    target.textContent = value ?? "";
  }
}

function toneForStatus(label) {
  if (["Ready", "Joined", "Saved"].includes(label)) {
    return "success";
  }
  if (["Error", "Join failed", "SDK failed", "SDK missing", "Missing"].includes(label)) {
    return "danger";
  }
  if (["Preparing", "Loading", "Saving", "Waiting", "Deleted"].includes(label)) {
    return "warning";
  }
  return "neutral";
}

function setPillTone(target, tone) {
  if (!target) {
    return;
  }
  target.classList.remove("success", "warning", "danger", "neutral");
  target.classList.add(tone);
}

function setZoomAccountStatus(status = null) {
  if (!zoomAccountStatus) {
    return;
  }
  const connected = Boolean(status?.authorized);
  const account = zoomAccountName(status);
  zoomAccountStatus.textContent = connected
    ? account
      ? `Zoom connected \u00b7 ${account}`
      : "Zoom connected"
    : "Zoom not connected";
  setPillTone(zoomAccountStatus, connected ? "success" : "warning");
}

function setStatus(label, message) {
  sdkStatus.textContent = label;
  sdkMessage.textContent = message;
  setPillTone(sdkStatus, toneForStatus(label));
  setLiveText(
    healthSdkStatus,
    ["Missing", "SDK failed", "SDK missing"].includes(label) ? label : "Initialized"
  );
  setLiveText(healthJoinedStatus, label === "Joined" ? "Joined" : "Not joined");
  if (sidebarLiveStatus) {
    sidebarLiveStatus.textContent = label;
    sidebarLiveStatus.classList.toggle("connected", label === "Joined");
    sidebarLiveStatus.classList.toggle("danger", toneForStatus(label) === "danger");
  }
}

function compactValue(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function pickNestedValue(value, paths) {
  for (const path of paths) {
    let current = value;
    for (const key of path) {
      current = current?.[key];
      if (current === undefined || current === null) {
        break;
      }
    }
    const cleaned = compactValue(current);
    if (cleaned) {
      return cleaned;
    }
  }
  return "";
}

function safeJson(value) {
  const seen = new WeakSet();
  const secretKeys = new Set([
    "access_token",
    "authorization",
    "code",
    "passWord",
    "password",
    "refresh_token",
    "sdkKey",
    "signature",
    "token",
    "zak"
  ]);

  try {
    return JSON.parse(
      JSON.stringify(value, (key, nestedValue) => {
        if (secretKeys.has(key)) {
          return nestedValue ? "[hidden]" : nestedValue;
        }
        if (typeof nestedValue === "object" && nestedValue !== null) {
          if (seen.has(nestedValue)) {
            return "[circular]";
          }
          seen.add(nestedValue);
        }
        return nestedValue;
      })
    );
  } catch (_jsonError) {
    return compactValue(value) || "[unserializable]";
  }
}

function zoomErrorDetails(error) {
  if (!error || typeof error !== "object") {
    return { message: compactValue(error) || "Unknown Zoom SDK error." };
  }

  return {
    code: pickNestedValue(error, [
      ["errorCode"],
      ["code"],
      ["status"],
      ["result", "errorCode"],
      ["error", "errorCode"]
    ]),
    message: pickNestedValue(error, [
      ["errorMessage"],
      ["reason"],
      ["message"],
      ["result", "errorMessage"],
      ["result", "message"],
      ["error", "message"]
    ]),
    method: pickNestedValue(error, [["method"], ["result", "method"]]),
    type: pickNestedValue(error, [["type"], ["name"]]),
    raw: safeJson(error)
  };
}

function formatZoomError(error) {
  if (!error) {
    return "Unknown Zoom SDK error.";
  }
  if (typeof error === "string") {
    return error;
  }

  const details = zoomErrorDetails(error);
  const fields = [];
  if (details.code) {
    fields.push(`code ${details.code}`);
  }
  if (details.message) {
    fields.push(details.message);
  }
  if (details.method) {
    fields.push(`method ${details.method}`);
  }
  if (details.type) {
    fields.push(`type ${details.type}`);
  }

  if (fields.length) {
    return fields.join(" | ");
  }

  return JSON.stringify(details.raw);
}

function zoomJoinHint(error, role, zak) {
  const code = zoomErrorDetails(error).code;
  if (code === "1") {
    return role === 1 && zak
      ? "Hint: check that this meeting belongs to the authorized Zoom user, the passcode is correct, and Meeting SDK join is allowed for the app/account."
      : "Hint: check the meeting number/passcode, waiting room settings, and whether the SDK app is allowed to join this meeting.";
  }
  if (code === "3712") {
    return "Hint: regenerate the signature with the same SDK app credentials loaded by the browser.";
  }
  return "";
}

function zoomJoinContext(signaturePayload, role, zak, joinData = {}) {
  return {
    meetingNumber: signaturePayload?.meeting_number || meetingNumberValue(),
    role,
    hostJoin: role === 1,
    hasZak: Boolean(zak),
    hasPasscode: Boolean(joinData.passcode ?? meetingPasswordInput.value),
    hasTeacherName: Boolean(teacherNameInput.value.trim()),
    sdkConfigured: Boolean(sdkConfig?.configured),
    sdkScriptUrl: sdkConfig?.sdk_js_url || "",
    origin: window.location.origin
  };
}

function meetingNumberValue() {
  return meetingNumberInput.value.replace(/\D+/g, "");
}

function selectedSavedMeeting() {
  const selectedId = Number(savedMeetingSelect.value);
  if (!selectedId) {
    return null;
  }
  return savedMeetings.find((meeting) => meeting.id === selectedId) || null;
}

function savedMeetingLabel(meeting) {
  const title = meeting.title || "Untitled meeting";
  return `${title} (${meeting.meeting_number})`;
}

function formatSavedMeetingDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function meetingCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }
  return cell;
}

function setSavedMeetingsMessage(message) {
  if (savedMeetingsMessage) {
    savedMeetingsMessage.textContent = message;
  }
}

function renderSavedMeetingsTable() {
  if (!savedMeetingsTable || !savedMeetingsCount) {
    return;
  }
  savedMeetingsCount.textContent = String(savedMeetings.length);
  savedMeetingsTable.innerHTML = "";

  if (!savedMeetings.length) {
    const row = document.createElement("tr");
    const cell = meetingCell("No saved meetings yet.", "empty");
    cell.colSpan = 6;
    row.appendChild(cell);
    savedMeetingsTable.appendChild(row);
    return;
  }

  for (const meeting of savedMeetings) {
    const row = document.createElement("tr");
    row.appendChild(meetingCell(meeting.title || "Untitled meeting"));
    row.appendChild(meetingCell(meeting.meeting_number));
    row.appendChild(meetingCell(meeting.passcode ? "Saved" : "Not saved"));
    row.appendChild(meetingCell(meeting.join_as_host ? "Host" : "Participant"));
    row.appendChild(meetingCell(formatSavedMeetingDate(meeting.updated_at)));

    const actions = document.createElement("td");
    actions.className = "actions";

    const joinSavedButton = document.createElement("button");
    joinSavedButton.type = "button";
    joinSavedButton.textContent = "Join";
    joinSavedButton.addEventListener("click", () => joinSavedMeeting(meeting));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      savedMeetingSelect.value = String(meeting.id);
      fillMeetingForm(meeting);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteMeeting(meeting));

    actions.append(joinSavedButton, editButton, deleteButton);
    row.appendChild(actions);
    savedMeetingsTable.appendChild(row);
  }
}

function renderSavedMeetings(selectedId = "") {
  if (!savedMeetingSelect) {
    renderSavedMeetingsTable();
    return;
  }
  savedMeetingSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "New meeting";
  savedMeetingSelect.appendChild(placeholder);

  for (const meeting of savedMeetings) {
    const option = document.createElement("option");
    option.value = String(meeting.id);
    option.textContent = savedMeetingLabel(meeting);
    savedMeetingSelect.appendChild(option);
  }

  savedMeetingSelect.value = selectedId ? String(selectedId) : "";
  deleteMeetingButton.disabled = !savedMeetingSelect.value;
  renderSavedMeetingsTable();
}

function fillMeetingForm(meeting) {
  if (!meeting) {
    meetingTitleInput.value = "";
    meetingNumberInput.value = "";
    meetingPasswordInput.value = "";
    joinAsHostInput.checked = Boolean(oauthAuthorized);
    deleteMeetingButton.disabled = true;
    return;
  }

  meetingTitleInput.value = meeting.title || "";
  meetingNumberInput.value = meeting.meeting_number;
  meetingPasswordInput.value = meeting.passcode || "";
  joinAsHostInput.checked = Boolean(meeting.join_as_host);
  deleteMeetingButton.disabled = false;
}

function applyInitialMeetingParams() {
  const params = new URLSearchParams(window.location.search);
  const meetingNumber = params.get("meetingNumber");
  const passcode = params.get("passcode");
  const title = params.get("title");
  const joinAsHost = params.get("joinAsHost");

  if (meetingNumber) {
    meetingNumberInput.value = meetingNumber.replace(/\D+/g, "");
  }
  if (passcode !== null) {
    meetingPasswordInput.value = passcode;
  }
  if (title) {
    meetingTitleInput.value = title;
  }
  if (joinAsHost !== null) {
    joinAsHostInput.checked = joinAsHost === "1" || joinAsHost === "true";
  }
}

function setAttendanceStatus(message) {
  attendanceMessage.textContent = message;
  if (message.startsWith("Attendance synced")) {
    setLiveText(healthBackendStatus, "Updated");
    setLiveText(liveLastSync, liveFormatDate(new Date().toISOString()));
  } else if (message.includes("failed")) {
    setLiveText(healthBackendStatus, "Error");
  } else if (message.includes("not started")) {
    setLiveText(healthBackendStatus, "Idle");
  }
}

function pickAttendeeName(attendee) {
  if (!attendee) {
    return "";
  }
  if (typeof attendee === "string") {
    return attendee;
  }

  return (
    attendee.userName ||
    attendee.displayName ||
    attendee.screenName ||
    attendee.user_name ||
    attendee.display_name ||
    attendee.name ||
    attendee.username ||
    attendee.customerKey ||
    attendee.email ||
    ""
  );
}

function normalizeParticipantNames(participants) {
  const names = [];
  const seen = new Set();
  for (const participant of participants || []) {
    const name = pickAttendeeName(participant).replace(/\s+/g, " ").trim();
    if (!name) {
      continue;
    }

    const key = name.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    names.push(name);
  }
  return names;
}

function normalizeName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function teacherParticipantKey() {
  return normalizeName(teacherNameInput?.value || "Teacher");
}

function excludeTeacherParticipantNames(participants) {
  const teacherKey = teacherParticipantKey();
  if (!teacherKey) {
    return normalizeParticipantNames(participants);
  }
  return normalizeParticipantNames(participants).filter((name) => normalizeName(name) !== teacherKey);
}

function findStudentForParticipant(name, students) {
  const key = normalizeName(name);
  return (
    students.find((student) => {
      const names = [student.full_name, ...(student.aliases || [])].map(normalizeName);
      return names.includes(key);
    }) || null
  );
}

function rememberParticipantNames(names) {
  for (const name of normalizeParticipantNames(names)) {
    participantCache.set(name.toLocaleLowerCase(), name);
  }
}

function forgetParticipantNames(names) {
  for (const name of normalizeParticipantNames(names)) {
    participantCache.delete(name.toLocaleLowerCase());
  }
}

function cachedParticipantNames() {
  return [...participantCache.values()];
}

function getAttendeeList(zoomMtg) {
  return new Promise((resolve, reject) => {
    if (!zoomMtg?.getAttendeeslist) {
      reject(new Error("Zoom SDK does not expose getAttendeeslist."));
      return;
    }

    zoomMtg.getAttendeeslist({
      success: (response) => resolve(response),
      error: (error) => reject(error)
    });
  });
}

function attendeesFromResponse(response) {
  if (Array.isArray(response)) {
    return response;
  }

  const result = response?.result || response || {};
  if (Array.isArray(result)) {
    return result;
  }

  return (
    result.attendeesList ||
    result.attendeeList ||
    result.attendees ||
    result.participants ||
    result.users ||
    []
  );
}

function collectParticipantNames(value, names = []) {
  if (!value) {
    return names;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (cleaned) {
      names.push(cleaned);
    }
    return names;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectParticipantNames(item, names);
    }
    return names;
  }

  if (typeof value !== "object") {
    return names;
  }

  const directName = pickAttendeeName(value);
  if (directName) {
    names.push(directName);
    return names;
  }

  for (const key of [
    "attendeesList",
    "attendeeList",
    "attendees",
    "participants",
    "users",
    "result"
  ]) {
    if (value[key]) {
      collectParticipantNames(value[key], names);
    }
  }

  return names;
}

async function sendAttendanceUpdate(meetingNumber, participants, ownerPresent = false) {
  const response = await fetch("/attendance/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      meeting_id: meetingNumber,
      participants,
      owner_present: ownerPresent
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Attendance update failed: ${response.status} ${details}`);
  }

  return response.json();
}

function renderPanelList(target, countTarget, items, emptyMessage, renderItem) {
  if (countTarget) {
    countTarget.textContent = String(items.length);
  }
  if (!target) {
    return;
  }
  target.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = emptyMessage;
    target.appendChild(empty);
    return;
  }
  for (const item of items) {
    target.appendChild(renderItem(item));
  }
}

function livePanelItem(text, action = null) {
  const item = document.createElement("div");
  item.className = "live-list-item";
  const label = document.createElement("span");
  const [title, detail] = String(text).split(" · ");
  const strong = document.createElement("strong");
  strong.textContent = title || "";
  label.appendChild(strong);
  if (detail) {
    const small = document.createElement("small");
    small.textContent = detail;
    label.appendChild(small);
  }
  item.appendChild(label);
  if (action) {
    item.appendChild(action);
  }
  return item;
}

function liveFormatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
}

async function createLiveAlias(studentId, aliasName) {
  const response = await fetch("/students/aliases", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      student_id: studentId,
      alias_name: aliasName
    })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unable to create alias: ${details}`);
  }
  await fetch("/reports/attendance-summary/generate", { method: "POST" });
  await refreshLiveAttendancePanels();
}

async function refreshLiveAttendancePanels() {
  if (!currentMeetingNumber) {
    return;
  }

  const query = `?meeting_id=${encodeURIComponent(currentMeetingNumber)}`;
  try {
    const [currentResponse, unmatchedResponse, historyResponse, studentsResponse] =
      await Promise.all([
        fetch(`/attendance/current${query}`),
        fetch(`/attendance/unmatched${query}`),
        fetch(`/attendance/history${query}`),
        fetch("/students")
      ]);
    if (
      !currentResponse.ok ||
      !unmatchedResponse.ok ||
      !historyResponse.ok ||
      !studentsResponse.ok
    ) {
      throw new Error("Unable to load live attendance panels.");
    }
    const [currentRecords, unmatchedRecords, historyRecords, students] = await Promise.all([
      currentResponse.json(),
      unmatchedResponse.json(),
      historyResponse.json(),
      studentsResponse.json()
    ]);

    const participantNames = normalizeParticipantNames([
      ...cachedParticipantNames(),
      ...currentRecords.map((record) => record.participant_name),
      ...unmatchedRecords.map((record) => record.participant_name)
    ]);
    const unmatchedKeys = new Set(
      unmatchedRecords.map((record) => normalizeName(record.participant_name))
    );
    const matchedRecords = currentRecords.filter(
      (record) => !unmatchedKeys.has(normalizeName(record.participant_name))
    );
    setLiveText(
      healthParticipantsStatus,
      participantNames.length ? `${participantNames.length} readable` : "Waiting"
    );
    setLiveText(healthBackendStatus, "Loaded");
    renderPanelList(
      liveParticipantList,
      liveParticipantCount,
      participantNames,
      "No participants read yet.",
      (name) => livePanelItem(name)
    );

    renderPanelList(
      liveMatchedList,
      liveMatchedCount,
      matchedRecords,
      "No matched students yet.",
      (record) => {
        const student = findStudentForParticipant(record.participant_name, students);
        return livePanelItem(
          `${student?.full_name || record.participant_name} · ${record.group_name || student?.group_name || "Matched roster"} / ${liveFormatDate(record.last_seen)}`
        );
      }
    );

    renderPanelList(
      liveUnmatchedList,
      liveUnmatchedCount,
      unmatchedRecords,
      "No unmatched names yet.",
      (record) => {
        const groupStudents = record.group_name
          ? students.filter((student) => student.group_name === record.group_name)
          : students;
        const select = document.createElement("select");
        for (const student of groupStudents) {
          const option = document.createElement("option");
          option.value = String(student.id);
          option.textContent = `${student.full_name} (${student.group_name})`;
          select.appendChild(option);
        }
        select.disabled = !groupStudents.length;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Alias";
        button.disabled = !groupStudents.length;
        button.addEventListener("click", () => {
          createLiveAlias(Number(select.value), record.participant_name).catch((error) => {
            console.error("Live alias creation failed", { error: zoomErrorDetails(error) });
            setAttendanceStatus(error.message);
          });
        });
        const actions = document.createElement("span");
        actions.className = "actions";
        actions.append(select, button);
        return livePanelItem(
          `${record.participant_name} · ${record.group_name || "Any group"}`,
          actions
        );
      }
    );

    renderPanelList(
      liveHistoryList,
      null,
      historyRecords.slice(0, 10),
      "No attendance history yet.",
      (record) =>
        livePanelItem(
          `${record.status}: ${record.participant_name} · ${liveFormatDate(record.last_seen)}`
        )
    );
  } catch (error) {
    console.error("Live attendance panels failed", { error: zoomErrorDetails(error) });
    setLiveText(healthBackendStatus, "Error");
  }
}

async function syncAttendanceOnce() {
  const zoomMtg = window.ZoomMtg;
  if (!currentMeetingNumber || !zoomMtg) {
    return;
  }

  try {
    const attendeeResponse = await getAttendeeList(zoomMtg);
    const attendeePayload = attendeesFromResponse(attendeeResponse);
    let participants = normalizeParticipantNames(attendeePayload);
    if (!participants.length) {
      participants = normalizeParticipantNames(collectParticipantNames(attendeeResponse));
    }
    rememberParticipantNames(participants);
    participants = excludeTeacherParticipantNames([...participants, ...cachedParticipantNames()]);
    const result = await sendAttendanceUpdate(currentMeetingNumber, participants, teacherClientJoined);
    lastAttendanceSyncLog = {
      checkedAt: new Date().toISOString(),
      meetingNumber: currentMeetingNumber,
      participants,
      result
    };
    setAttendanceStatus(
      `Attendance synced: ${result.active_count} active, ${result.unmatched_participants.length} unmatched, ${participants.length} names read.`
    );
    refreshLiveAttendancePanels();
  } catch (error) {
    console.error("SDK attendance sync failed", {
      error: zoomErrorDetails(error),
      meetingNumber: currentMeetingNumber,
      cachedParticipants: cachedParticipantNames().length
    });
    setAttendanceStatus(`Attendance sync failed: ${formatZoomError(error)}`);
  }
}

function startAttendanceSync(meetingNumber) {
  currentMeetingNumber = meetingNumber;
  participantCache = new Map();
  if (attendanceSyncTimer) {
    clearInterval(attendanceSyncTimer);
  }

  syncAttendanceOnce();
  refreshLiveAttendancePanels();
  attendanceSyncTimer = window.setInterval(syncAttendanceOnce, ATTENDANCE_SYNC_INTERVAL_MS);
}

function registerParticipantListeners(zoomMtg) {
  if (!zoomMtg?.inMeetingServiceListener) {
    return;
  }

  zoomMtg.inMeetingServiceListener("onUserJoin", (payload) => {
    rememberParticipantNames(collectParticipantNames(payload));
    syncAttendanceOnce();
  });
  zoomMtg.inMeetingServiceListener("onUserLeave", (payload) => {
    forgetParticipantNames(collectParticipantNames(payload));
    syncAttendanceOnce();
  });
  zoomMtg.inMeetingServiceListener("onUserUpdate", (payload) => {
    rememberParticipantNames(collectParticipantNames(payload));
    syncAttendanceOnce();
  });
}

function scriptBaseUrl(src) {
  const url = new URL(src, window.location.href);
  url.pathname = url.pathname.split("/").slice(0, -1).join("/");
  return url.toString().replace(/\/$/, "");
}

function sdkScriptUrls(mainScriptUrl) {
  const baseUrl = scriptBaseUrl(mainScriptUrl);
  return [
    `${baseUrl}/lib/vendor/react.min.js`,
    `${baseUrl}/lib/vendor/react-dom.min.js`,
    `${baseUrl}/lib/vendor/redux.min.js`,
    `${baseUrl}/lib/vendor/redux-thunk.min.js`,
    `${baseUrl}/lib/vendor/lodash.min.js`,
    mainScriptUrl
  ];
}

function loadScript(src) {
  if (!src) {
    return Promise.reject(new Error("Meeting SDK script URL is not configured."));
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", resolve);
    script.addEventListener("error", () =>
      reject(new Error("Unable to load the Zoom Meeting SDK script."))
    );
    document.head.appendChild(script);
  });
}

function loadMeetingSdk(mainScriptUrl) {
  if (sdkScriptPromise) {
    return sdkScriptPromise;
  }

  sdkScriptPromise = sdkScriptUrls(mainScriptUrl).reduce(
    (promise, scriptUrl) => promise.then(() => loadScript(scriptUrl)),
    Promise.resolve()
  );
  return sdkScriptPromise;
}

async function loadConfig() {
  const response = await fetch("/zoom/meeting-sdk/config");
  if (!response.ok) {
    throw new Error("Unable to load Meeting SDK configuration.");
  }

  sdkConfig = await response.json();
  if (!sdkConfig.configured) {
    setStatus("Missing", "Set ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET, then restart the backend.");
    joinButton.disabled = true;
    return;
  }

  setStatus("Ready");
  joinButton.disabled = false;
}

async function loadOAuthStatus() {
  const response = await fetch("/zoom/oauth/status");
  if (!response.ok) {
    throw new Error("Unable to load Zoom authorization status.");
  }

  const status = await response.json();
  oauthAuthorized = Boolean(status.authorized);
  setZoomAccountStatus(status);
  oauthMessage.textContent = oauthAuthorized
    ? "Zoom connected. Host join can request a ZAK token."
    : "Connect Zoom before joining as host.";
  if (!oauthAuthorized) {
    zoomUserMessage.textContent = "";
    zoomAccountDisplayName = "";
  } else if (status.email || status.display_name || status.user_id) {
    syncTeacherNameWithZoom(status);
    const label = currentTeacherName();
    zoomUserMessage.textContent = `Authorized as ${label}${status.email && status.email !== label ? ` <${status.email}>` : ""}.`;
  } else {
    zoomUserMessage.textContent =
      "Zoom is authorized, but the account identity could not be verified. Add a user profile read scope, save the app, then disconnect and authorize again.";
    console.warn("Zoom OAuth profile is unavailable", {
      profileError: status.profile_error,
      scopes: status.scopes || []
    });
  }
  joinAsHostInput.disabled = !oauthAuthorized;
  zoomLoginButton.textContent = oauthAuthorized ? "Manage" : "Connect Zoom";
  if (zoomDisconnectButton) {
    zoomDisconnectButton.hidden = true;
  }
  if (oauthAuthorized) {
    joinAsHostInput.checked = true;
  } else {
    joinAsHostInput.checked = false;
  }
}

async function loadSavedMeetings() {
  const response = await fetch("/zoom/saved-meetings", {
    credentials: "same-origin"
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unable to load saved meetings: ${details}`);
  }
  savedMeetings = await response.json();
  renderSavedMeetings(savedMeetingSelect?.value);
  setSavedMeetingsMessage(
    savedMeetings.length
      ? `${savedMeetings.length} saved meeting${savedMeetings.length === 1 ? "" : "s"} available.`
      : "No saved meetings yet."
  );
}

async function saveCurrentMeeting() {
  console.log("Save meeting clicked");
  setSavedMeetingsMessage("Saving meeting...");
  setStatus("Saving", "Saving meeting credentials...");
  const meetingNumber = meetingNumberValue();
  if (!meetingNumber) {
    setSavedMeetingsMessage("Enter a meeting number before saving.");
    setStatus("Waiting", "Enter a Zoom meeting number before saving.");
    return;
  }

  saveMeetingButton.disabled = true;
  const originalButtonText = saveMeetingButton.textContent;
  saveMeetingButton.textContent = "Saving...";
  try {
    const response = await fetch("/zoom/saved-meetings", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meeting_number: meetingNumber,
        title: meetingTitleInput.value.trim() || null,
        passcode: meetingPasswordInput.value || null,
        join_as_host: joinAsHostInput.checked
      })
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Unable to save meeting: ${details}`);
    }
    const savedMeeting = await response.json();
    await loadSavedMeetings();
    renderSavedMeetings(savedMeeting.id);
    fillMeetingForm(savedMeeting);
    setSavedMeetingsMessage(`Saved "${savedMeeting.title || savedMeeting.meeting_number}".`);
    setStatus("Saved", "Meeting number and passcode were saved for this teacher session.");
  } catch (error) {
    console.error("Saved meeting failed", { error: zoomErrorDetails(error) });
    setSavedMeetingsMessage(error.message);
    setStatus("Error", error.message);
  } finally {
    saveMeetingButton.disabled = false;
    saveMeetingButton.textContent = originalButtonText;
  }
}

async function deleteMeeting(meeting) {
  if (!meeting) {
    return;
  }

  deleteMeetingButton.disabled = true;
  try {
    const response = await fetch(`/zoom/saved-meetings/${meeting.id}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Unable to delete saved meeting: ${details}`);
    }
    await loadSavedMeetings();
    fillMeetingForm(null);
    setSavedMeetingsMessage(`Deleted "${meeting.title || meeting.meeting_number}".`);
    setStatus("Deleted", "Saved meeting was removed.");
  } catch (error) {
    console.error("Delete saved meeting failed", { error: zoomErrorDetails(error) });
    setSavedMeetingsMessage(error.message);
    setStatus("Error", error.message);
    deleteMeetingButton.disabled = false;
  }
}

async function deleteCurrentMeeting() {
  await deleteMeeting(selectedSavedMeeting());
}

async function joinSavedMeeting(meeting) {
  savedMeetingSelect.value = String(meeting.id);
  await prepareJoin({
    meetingNumber: meeting.meeting_number,
    passcode: meeting.passcode || "",
    joinAsHost: Boolean(meeting.join_as_host)
  });
}

async function disconnectZoom() {
  if (zoomDisconnectButton) {
    zoomDisconnectButton.disabled = true;
  }
  zoomLoginButton.disabled = true;
  try {
    const response = await fetch("/zoom/oauth/disconnect", { method: "POST" });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Unable to disconnect Zoom: ${details}`);
    }
    oauthAuthorized = false;
    teacherClientJoined = false;
    oauthMessage.textContent = "Zoom authorization was cleared.";
    zoomUserMessage.textContent = "";
    zoomAccountDisplayName = "";
    setZoomAccountStatus({ authorized: false });
    joinAsHostInput.checked = false;
    joinAsHostInput.disabled = true;
    if (zoomDisconnectButton) {
      zoomDisconnectButton.hidden = true;
    }
    zoomLoginButton.textContent = "Connect Zoom";
  } catch (error) {
    console.error("Zoom disconnect failed", { error: zoomErrorDetails(error) });
    oauthMessage.textContent = error.message;
  } finally {
    if (zoomDisconnectButton) {
      zoomDisconnectButton.disabled = false;
    }
    zoomLoginButton.disabled = false;
  }
}

async function createSignature(meetingNumber, role) {
  const response = await fetch("/zoom/meeting-sdk/signature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      meeting_number: meetingNumber,
      role
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unable to create Meeting SDK signature: ${details}`);
  }

  return response.json();
}

async function fetchZak() {
  const response = await fetch("/zoom/oauth/zak");
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unable to get ZAK token: ${details}`);
  }

  const payload = await response.json();
  return payload.zak;
}

async function checkZoomMeeting(meetingNumber) {
  const response = await fetch(`/zoom/meetings/${encodeURIComponent(meetingNumber)}/check`);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unable to check Zoom meeting: ${details}`);
  }
  return response.json();
}

function displayMeetingCheck(check) {
  if (!check.can_read) {
    meetingCheckMessage.textContent = `Meeting check failed: ${check.error}`;
    console.warn("Zoom meeting check failed", check);
    return;
  }

  const ownerStatus = check.owner_matches_authorized_user
    ? "host matches authorized user"
    : "host does not match authorized user";
  const settingParts = [
    check.has_password ? "password yes" : "password no",
    check.settings?.waiting_room === true ? "waiting room on" : "",
    check.settings?.meeting_authentication === true || check.settings?.enforce_login === true
      ? "authentication required"
      : ""
  ].filter(Boolean);
  meetingCheckMessage.textContent = `Meeting check: ${ownerStatus}${settingParts.length ? `, ${settingParts.join(", ")}` : ""}.`;
  console.log("Zoom meeting check", check);
}

function prepareClientJoin(signaturePayload, zak, role, joinData = {}) {
  const zoomMtg = window.ZoomMtg;
  if (!zoomMtg) {
    setStatus(
      "SDK missing",
      "Signature created, but ZoomMtg was not available after loading the SDK scripts."
    );
    return;
  }

  zoomMtg.setZoomJSLib?.(`${scriptBaseUrl(sdkConfig.sdk_js_url)}/lib`, "/av");
  zoomMtg.preLoadWasm?.();
  zoomMtg.prepareWebSDK?.();
  registerParticipantListeners(zoomMtg);
  zoomMtg.init({
    leaveUrl: `${window.location.origin}/teacher-meeting`,
    patchJsMedia: true,
    success: () => {
      const joinOptions = {
        signature: signaturePayload.signature,
        sdkKey: signaturePayload.client_id,
        meetingNumber: signaturePayload.meeting_number,
        passWord: joinData.passcode ?? meetingPasswordInput.value,
        userName: currentTeacherName(),
        success: () => {
          teacherClientJoined = true;
          setStatus("Joined", "Teacher client joined the meeting through the SDK.");
          startAttendanceSync(signaturePayload.meeting_number);
        },
        error: (error) => {
          const hint = zoomJoinHint(error, role, zak);
          const message = [
            formatZoomError(error),
            `role ${role}`,
            `zak ${zak ? "yes" : "no"}`,
            `meeting ${signaturePayload.meeting_number}`,
            hint
          ]
            .filter(Boolean)
            .join(" | ");
          console.error("Zoom SDK join failed", {
            error: zoomErrorDetails(error),
            context: zoomJoinContext(signaturePayload, role, zak, joinData)
          });
          setStatus("Join failed", message);
        }
      };
      if (zak) {
        joinOptions.zak = zak;
      }
      zoomMtg.join(joinOptions);
    },
    error: (error) => {
      console.error("Zoom SDK init failed", {
        error: zoomErrorDetails(error),
        context: zoomJoinContext(signaturePayload, role, zak, joinData)
      });
      setStatus("SDK failed", formatZoomError(error));
    }
  });
}

async function prepareJoin(joinData = {}) {
  const meetingNumber = joinData.meetingNumber || meetingNumberValue();
  if (!meetingNumber) {
    setStatus("Waiting", "Enter a Zoom meeting number first.");
    return;
  }

  teacherClientJoined = false;
  joinButton.disabled = true;
  const joinAsHost = joinData.joinAsHost ?? joinAsHostInput.checked;
  const role = joinAsHost ? 1 : 0;
  setStatus(
    "Preparing",
    joinAsHost ? "Creating host signature and ZAK token..." : "Creating a Meeting SDK signature..."
  );
  try {
    if (oauthAuthorized) {
      const meetingCheck = await checkZoomMeeting(meetingNumber);
      displayMeetingCheck(meetingCheck);
    }
    const signaturePayload = await createSignature(meetingNumber, role);
    const zak = joinAsHost ? await fetchZak() : null;
    setStatus("Loading", "Loading the Zoom Meeting SDK script...");
    await loadMeetingSdk(sdkConfig.sdk_js_url);
    prepareClientJoin(signaturePayload, zak, role, joinData);
  } catch (error) {
    console.error("Teacher join preparation failed", {
      error: zoomErrorDetails(error),
      context: {
        meetingNumber,
        role,
        hostJoin: joinAsHost,
        hasPasscode: Boolean(joinData.passcode ?? meetingPasswordInput.value),
        oauthAuthorized
      }
    });
    setStatus("Error", error.message);
  } finally {
    joinButton.disabled = false;
  }
}

joinButton.disabled = true;
joinAsHostInput.disabled = true;
if (savedMeetingSelect) {
  savedMeetingSelect.addEventListener("change", () => {
    fillMeetingForm(selectedSavedMeeting());
  });
}
if (saveMeetingButton) {
  saveMeetingButton.addEventListener("click", saveCurrentMeeting);
} else {
  console.error("Save Meeting button was not found in the page HTML.");
}
if (deleteMeetingButton) {
  deleteMeetingButton.addEventListener("click", deleteCurrentMeeting);
}
joinButton.addEventListener("click", () => {
  prepareJoin();
});
zoomLoginButton.addEventListener("click", () => {
  window.location.href = oauthAuthorized ? "/#settings" : "/zoom/oauth/start?prompt=login";
});
if (zoomDisconnectButton) {
  zoomDisconnectButton.addEventListener("click", disconnectZoom);
}
applyInitialMeetingParams();
loadConfig().catch((error) => {
  console.error(error);
  setStatus("Error", error.message);
  joinButton.disabled = true;
});
loadOAuthStatus()
  .catch((error) => {
    console.error(error);
    oauthMessage.textContent = error.message;
  })
  .then(applyInitialMeetingParams);
loadSavedMeetings().catch((error) => {
  console.error("Load saved meetings failed", { error: zoomErrorDetails(error) });
});
