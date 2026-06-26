const backendStatus = document.querySelector("#backend-status");
const meetingId = document.querySelector("#meeting-id");
const participantCount = document.querySelector("#participant-count");
const lastSent = document.querySelector("#last-sent");
const lessonTitle = document.querySelector("#lesson-title");
const lessonGroup = document.querySelector("#lesson-group");
const unmatchedCount = document.querySelector("#unmatched-count");
const unmatchedNames = document.querySelector("#unmatched-names");
const errorMessage = document.querySelector("#error-message");
const forceSendButton = document.querySelector("#force-send");
const openDashboardButton = document.querySelector("#open-dashboard");

const statusBaseClass =
  "inline-flex min-h-[30px] items-center rounded-full border px-2.5 text-[0.82rem] font-black";
const onlineStatusClass = `${statusBaseClass} border-green-200 bg-green-50 text-success`;
const offlineStatusClass = `${statusBaseClass} border-red-200 bg-red-50 text-danger`;

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function setBackendStatus(online) {
  backendStatus.textContent = online ? "Online" : "Offline";
  backendStatus.className = online ? onlineStatusClass : offlineStatusClass;
}

function renderSnapshot(snapshot) {
  setBackendStatus(Boolean(snapshot.backendOnline));
  meetingId.textContent = snapshot.meetingId || "-";
  participantCount.textContent = String(snapshot.participantCount || 0);
  lastSent.textContent = formatTime(snapshot.lastSentAt);
  lessonTitle.textContent = snapshot.meetingTitle || "Not linked";
  lessonGroup.textContent = snapshot.meetingGroupName ? `Group ${snapshot.meetingGroupName}` : "No group";
  const unmatched = snapshot.unmatchedParticipants || [];
  unmatchedCount.textContent = String(unmatched.length);
  unmatchedNames.textContent = unmatched.length ? unmatched.join(", ") : "All matched";
  errorMessage.textContent = snapshot.lastError || "";
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }

      resolve(response);
    });
  });
}

async function refreshStatus() {
  const response = await sendRuntimeMessage({ type: "popup:get-status" });
  if (!response?.ok) {
    errorMessage.textContent = response?.error || "Unable to load extension status.";
    return;
  }

  renderSnapshot(response.snapshot);
}

forceSendButton.addEventListener("click", async () => {
  forceSendButton.disabled = true;
  errorMessage.textContent = "";

  const response = await sendRuntimeMessage({ type: "popup:force-send" });
  if (response?.snapshot) {
    renderSnapshot(response.snapshot);
  }
  if (!response?.ok) {
    errorMessage.textContent = response?.error || "Force send failed.";
  }

  forceSendButton.disabled = false;
});

openDashboardButton.addEventListener("click", () => {
  sendRuntimeMessage({ type: "popup:open-dashboard" });
});

refreshStatus();
