const meetingFilterInput = document.querySelector("#meeting-filter");
const refreshButton = document.querySelector("#refresh-button");
const exportLink = document.querySelector("#export-link");
const currentTable = document.querySelector("#current-table");
const historyTable = document.querySelector("#history-table");
const activeCount = document.querySelector("#active-count");
const historyCount = document.querySelector("#history-count");

const REFRESH_INTERVAL_MS = 5000;

function formatDate(value) {
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
  const meetingId = meetingFilterInput.value.trim();
  if (meetingId) {
    params.set("meeting_id", meetingId);
  }

  exportLink.href = `/attendance/export.csv${params.toString() ? `?${params.toString()}` : ""}`;
  return params.toString() ? `?${params.toString()}` : "";
}

function renderEmptyRow(target, columnCount, label) {
  target.innerHTML = `<tr><td class="empty" colspan="${columnCount}">${label}</td></tr>`;
}

function renderCurrent(records) {
  activeCount.textContent = String(records.length);
  if (!records.length) {
    renderEmptyRow(currentTable, 5, "No active participants yet.");
    return;
  }

  currentTable.innerHTML = "";
  for (const record of records) {
    const row = document.createElement("tr");
    [
      record.participant_name,
      record.meeting_id,
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
    renderEmptyRow(historyTable, 6, "No attendance history yet.");
    return;
  }

  historyTable.innerHTML = "";
  for (const record of records) {
    const row = document.createElement("tr");
    const values = [
      record.participant_name,
      record.meeting_id,
      record.status,
      formatDate(record.first_seen),
      formatDate(record.last_seen),
      formatDuration(record.total_seconds),
    ];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index === 2) {
        cell.className = `status-${record.status}`;
      }
      row.appendChild(cell);
    });

    historyTable.appendChild(row);
  }
}

async function refreshDashboard() {
  const query = buildQuery();
  const [currentResponse, historyResponse] = await Promise.all([
    fetch(`/attendance/current${query}`),
    fetch(`/attendance/history${query}`),
  ]);

  if (!currentResponse.ok || !historyResponse.ok) {
    throw new Error("Unable to refresh dashboard data.");
  }

  const [currentRecords, historyRecords] = await Promise.all([
    currentResponse.json(),
    historyResponse.json(),
  ]);

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
meetingFilterInput.addEventListener("change", safeRefresh);

safeRefresh();
setInterval(safeRefresh, REFRESH_INTERVAL_MS);
