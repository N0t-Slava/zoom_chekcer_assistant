const meetingFilterInput = document.querySelector("#meeting-filter");
const meetingSessionFilter = document.querySelector("#meeting-session-filter");
const refreshButton = document.querySelector("#refresh-button");
const exportLink = document.querySelector("#export-link");
const scheduleFileInput = document.querySelector("#schedule-file");
const replaceScheduleInput = document.querySelector("#replace-schedule");
const importScheduleButton = document.querySelector("#import-schedule-button");
const scheduleImportStatus = document.querySelector("#schedule-import-status");
const scheduleTable = document.querySelector("#schedule-table");
const generateSummaryButton = document.querySelector("#generate-summary-button");
const summaryStatus = document.querySelector("#summary-status");
const summaryTable = document.querySelector("#summary-table");
const studentsFileInput = document.querySelector("#students-file");
const replaceStudentsInput = document.querySelector("#replace-students");
const importStudentsButton = document.querySelector("#import-students-button");
const studentsImportStatus = document.querySelector("#students-import-status");
const studentsTable = document.querySelector("#students-table");
const meetingsTable = document.querySelector("#meetings-table");
const currentTable = document.querySelector("#current-table");
const historyTable = document.querySelector("#history-table");
const scheduleCount = document.querySelector("#schedule-count");
const summaryCount = document.querySelector("#summary-count");
const studentCount = document.querySelector("#student-count");
const meetingCount = document.querySelector("#meeting-count");
const activeCount = document.querySelector("#active-count");
const historyCount = document.querySelector("#history-count");

const REFRESH_INTERVAL_MS = 5000;

function bindFileLabel(input) {
  const labelText = input.closest(".file-picker")?.querySelector("span");
  if (!labelText) {
    return;
  }

  labelText.dataset.defaultText = labelText.textContent;
  input.addEventListener("change", () => {
    labelText.textContent = input.files?.[0]?.name || labelText.dataset.defaultText;
  });
}

function resetFileLabel(input) {
  const labelText = input.closest(".file-picker")?.querySelector("span");
  if (labelText?.dataset.defaultText) {
    labelText.textContent = labelText.dataset.defaultText;
  }
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function buildQuery() {
  const params = new URLSearchParams();
  const meetingSessionId = meetingSessionFilter.value;
  const meetingId = meetingFilterInput.value.trim();

  if (meetingSessionId) {
    params.set("meeting_session_id", meetingSessionId);
  } else if (meetingId) {
    params.set("meeting_id", meetingId);
  }

  exportLink.href = `/attendance/export.csv${params.toString() ? `?${params.toString()}` : ""}`;
  return params.toString() ? `?${params.toString()}` : "";
}

function meetingLabel(meeting) {
  const title = meeting.title || "Untitled";
  const group = meeting.group_name ? ` / ${meeting.group_name}` : "";
  return `#${meeting.id} ${title}${group} (${formatDate(meeting.started_at)})`;
}

function renderEmptyRow(target, columnCount, label) {
  target.innerHTML = `<tr><td class="empty" colspan="${columnCount}">${label}</td></tr>`;
}

function renderMeetings(meetings) {
  meetingCount.textContent = String(meetings.length);

  const selectedSession = meetingSessionFilter.value;
  meetingSessionFilter.innerHTML = '<option value="">All sessions</option>';
  for (const meeting of meetings) {
    const option = document.createElement("option");
    option.value = String(meeting.id);
    option.textContent = meetingLabel(meeting);
    meetingSessionFilter.appendChild(option);
  }
  meetingSessionFilter.value = meetings.some((meeting) => String(meeting.id) === selectedSession) ? selectedSession : "";

  if (!meetings.length) {
    renderEmptyRow(meetingsTable, 7, "No meetings yet.");
    return;
  }

  meetingsTable.innerHTML = "";
  for (const meeting of meetings) {
    const row = document.createElement("tr");

    [
      `#${meeting.id}`,
      meeting.zoom_meeting_id,
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const titleCell = document.createElement("td");
    const titleInput = document.createElement("input");
    titleInput.value = meeting.title || "";
    titleInput.placeholder = "Lesson title";
    titleCell.appendChild(titleInput);
    row.appendChild(titleCell);

    const groupCell = document.createElement("td");
    const groupInput = document.createElement("input");
    groupInput.value = meeting.group_name || "";
    groupInput.placeholder = "Group";
    groupCell.appendChild(groupInput);
    row.appendChild(groupCell);

    [formatDate(meeting.started_at), formatDate(meeting.ended_at)].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "Active";
      row.appendChild(cell);
    });

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";
    saveButton.addEventListener("click", async () => {
      await updateMeeting(meeting.id, titleInput.value, groupInput.value);
    });
    actionsCell.appendChild(saveButton);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.disabled = Boolean(meeting.ended_at);
    closeButton.addEventListener("click", async () => {
      await closeMeeting(meeting.id);
    });
    actionsCell.appendChild(closeButton);

    const csvLink = document.createElement("a");
    csvLink.href = `/attendance/export.csv?meeting_session_id=${meeting.id}`;
    csvLink.textContent = "CSV";
    actionsCell.appendChild(csvLink);

    row.appendChild(actionsCell);
    meetingsTable.appendChild(row);
  }
}

function renderStudents(students) {
  studentCount.textContent = String(students.length);
  if (!students.length) {
    renderEmptyRow(studentsTable, 3, "No students imported yet.");
    return;
  }

  studentsTable.innerHTML = "";
  for (const student of students) {
    const row = document.createElement("tr");
    [
      student.full_name,
      student.group_name,
      formatDate(student.updated_at),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    studentsTable.appendChild(row);
  }
}

function renderSchedule(entries) {
  scheduleCount.textContent = String(entries.length);
  if (!entries.length) {
    renderEmptyRow(scheduleTable, 4, "No schedule imported yet.");
    return;
  }

  scheduleTable.innerHTML = "";
  for (const entry of entries) {
    const row = document.createElement("tr");
    [
      entry.title || "",
      entry.group_name,
      formatDate(entry.starts_at),
      formatDate(entry.ends_at),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    scheduleTable.appendChild(row);
  }
}

function renderSummary(summaries) {
  summaryCount.textContent = String(summaries.length);
  if (!summaries.length) {
    renderEmptyRow(summaryTable, 6, "Generate the journal after importing students and schedule.");
    return;
  }

  summaryTable.innerHTML = "";
  for (const summary of summaries) {
    const row = document.createElement("tr");
    const values = [
      summary.student_name,
      summary.group_name,
      summary.lesson_title || "",
      formatDate(summary.lesson_starts_at),
      summary.status,
      formatDuration(summary.total_seconds),
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index === 4) {
        cell.className = summary.status === "п" ? "status-active" : "status-left";
      }
      row.appendChild(cell);
    });

    summaryTable.appendChild(row);
  }
}

function renderCurrent(records) {
  activeCount.textContent = String(records.length);
  if (!records.length) {
    renderEmptyRow(currentTable, 6, "No active participants yet.");
    return;
  }

  currentTable.innerHTML = "";
  for (const record of records) {
    const row = document.createElement("tr");
    [
      record.participant_name,
      record.meeting_id,
      record.meeting_session_id ? `#${record.meeting_session_id}` : "",
      formatDate(record.first_seen),
      formatDate(record.last_seen),
      formatDuration(record.total_seconds),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    currentTable.appendChild(row);
  }
}

function renderHistory(records) {
  historyCount.textContent = String(records.length);
  if (!records.length) {
    renderEmptyRow(historyTable, 7, "No attendance history yet.");
    return;
  }

  historyTable.innerHTML = "";
  for (const record of records) {
    const row = document.createElement("tr");
    const values = [
      record.participant_name,
      record.meeting_id,
      record.meeting_session_id ? `#${record.meeting_session_id}` : "",
      record.status,
      formatDate(record.first_seen),
      formatDate(record.last_seen),
      formatDuration(record.total_seconds),
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index === 3) {
        cell.className = `status-${record.status}`;
      }
      row.appendChild(cell);
    });

    historyTable.appendChild(row);
  }
}

async function updateMeeting(meetingId, title, groupName) {
  const response = await fetch(`/meetings/${meetingId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      group_name: groupName,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to update meeting.");
  }

  await safeRefresh();
}

async function closeMeeting(meetingId) {
  const response = await fetch(`/meetings/${meetingId}/close`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to close meeting.");
  }

  await safeRefresh();
}

async function importStudents() {
  const file = studentsFileInput.files?.[0];
  if (!file) {
    studentsImportStatus.textContent = "Choose a CSV file first.";
    return;
  }

  studentsImportStatus.textContent = "Importing...";
  const csvContent = await file.text();
  const response = await fetch("/students/import.csv", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      csv_content: csvContent,
      replace_existing: replaceStudentsInput.checked,
    }),
  });

  if (!response.ok) {
    studentsImportStatus.textContent = "Import failed.";
    throw new Error("Unable to import students.");
  }

  const result = await response.json();
  studentsImportStatus.textContent = `Imported ${result.imported_count}, created ${result.created_count}, updated ${result.updated_count}, skipped ${result.skipped_count}.`;
  if (result.errors.length) {
    console.warn("Student import warnings", result.errors);
  }

  studentsFileInput.value = "";
  resetFileLabel(studentsFileInput);
  await safeRefresh();
}

async function importSchedule() {
  const file = scheduleFileInput.files?.[0];
  if (!file) {
    scheduleImportStatus.textContent = "Choose a CSV file first.";
    return;
  }

  scheduleImportStatus.textContent = "Importing...";
  const csvContent = await file.text();
  const response = await fetch("/schedule/import.csv", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      csv_content: csvContent,
      replace_existing: replaceScheduleInput.checked,
    }),
  });

  if (!response.ok) {
    scheduleImportStatus.textContent = "Import failed.";
    throw new Error("Unable to import schedule.");
  }

  const result = await response.json();
  scheduleImportStatus.textContent = `Imported ${result.imported_count}, created ${result.created_count}, updated ${result.updated_count}, skipped ${result.skipped_count}.`;
  if (result.errors.length) {
    console.warn("Schedule import warnings", result.errors);
  }

  scheduleFileInput.value = "";
  resetFileLabel(scheduleFileInput);
  await safeRefresh();
}

async function generateSummary() {
  summaryStatus.textContent = "Generating...";
  const response = await fetch("/reports/attendance-summary/generate", {
    method: "POST",
  });

  if (!response.ok) {
    summaryStatus.textContent = "Generation failed.";
    throw new Error("Unable to generate attendance summary.");
  }

  const result = await response.json();
  summaryStatus.textContent = `Generated ${result.generated_count}: ${result.present_count} п, ${result.absent_count} н.`;
  await safeRefresh();
}

async function refreshDashboard() {
  const query = buildQuery();
  const [summaryResponse, scheduleResponse, studentsResponse, meetingsResponse, currentResponse, historyResponse] = await Promise.all([
    fetch("/reports/attendance-summary"),
    fetch("/schedule"),
    fetch("/students"),
    fetch("/meetings"),
    fetch(`/attendance/current${query}`),
    fetch(`/attendance/history${query}`),
  ]);

  if (!summaryResponse.ok || !scheduleResponse.ok || !studentsResponse.ok || !meetingsResponse.ok || !currentResponse.ok || !historyResponse.ok) {
    throw new Error("Unable to refresh dashboard data.");
  }

  const [summaries, schedule, students, meetings, currentRecords, historyRecords] = await Promise.all([
    summaryResponse.json(),
    scheduleResponse.json(),
    studentsResponse.json(),
    meetingsResponse.json(),
    currentResponse.json(),
    historyResponse.json(),
  ]);

  renderSummary(summaries);
  renderSchedule(schedule);
  renderStudents(students);
  renderMeetings(meetings);
  renderCurrent(currentRecords);
  renderHistory(historyRecords);
}

async function safeRefresh() {
  try {
    await refreshDashboard();
  } catch (error) {
    console.error(error);
  }
}

refreshButton.addEventListener("click", safeRefresh);
importStudentsButton.addEventListener("click", () => {
  importStudents().catch((error) => console.error(error));
});
importScheduleButton.addEventListener("click", () => {
  importSchedule().catch((error) => console.error(error));
});
generateSummaryButton.addEventListener("click", () => {
  generateSummary().catch((error) => console.error(error));
});
meetingFilterInput.addEventListener("change", safeRefresh);
meetingSessionFilter.addEventListener("change", safeRefresh);
bindFileLabel(scheduleFileInput);
bindFileLabel(studentsFileInput);

safeRefresh();
setInterval(safeRefresh, REFRESH_INTERVAL_MS);
