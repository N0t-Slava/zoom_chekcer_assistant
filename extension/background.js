const API_BASE_URL = "http://127.0.0.1:8000";
const LOG_PREFIX = "[Zoom Attendance Tracker]";

let latestSnapshot = {
  backendOnline: false,
  backendCheckedAt: null,
  meetingId: null,
  meetingSessionId: null,
  meetingTitle: null,
  meetingGroupName: null,
  participantCount: 0,
  participants: [],
  lastSentAt: null,
  lastError: null,
};

function updateSnapshot(patch) {
  latestSnapshot = {
    ...latestSnapshot,
    ...patch,
  };
}

async function checkBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    updateSnapshot({
      backendOnline: true,
      backendCheckedAt: new Date().toISOString(),
      lastError: null,
    });
  } catch (error) {
    updateSnapshot({
      backendOnline: false,
      backendCheckedAt: new Date().toISOString(),
      lastError: error.message,
    });
  }

  return latestSnapshot.backendOnline;
}

async function sendAttendanceUpdate(message) {
  updateSnapshot({
    meetingId: message.meetingId,
    participantCount: message.participants.length,
    participants: message.participants,
  });

  try {
    const response = await fetch(`${API_BASE_URL}/attendance/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meeting_id: message.meetingId,
        participants: message.participants,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Attendance update failed: ${response.status} ${details}`);
    }

    const payload = await response.json();
    updateSnapshot({
      backendOnline: true,
      backendCheckedAt: new Date().toISOString(),
      meetingId: payload.meeting_id,
      meetingSessionId: payload.meeting_session_id,
      meetingTitle: payload.meeting_title,
      meetingGroupName: payload.meeting_group_name,
      participantCount: payload.active_count,
      lastSentAt: new Date().toISOString(),
      lastError: null,
    });

    console.log(`${LOG_PREFIX} Attendance update sent to backend`, payload);
    return { ok: true, payload };
  } catch (error) {
    updateSnapshot({
      backendOnline: false,
      backendCheckedAt: new Date().toISOString(),
      lastError: error.message,
    });
    console.error(`${LOG_PREFIX} Unable to send attendance update`, error);
    return { ok: false, error: error.message };
  }
}

async function getActiveZoomTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs.find((tab) => /https:\/\/([^/]+\.)?zoom\.us\/|https:\/\/app\.zoom\.us\//.test(tab.url || "")) || null;
}

async function forceSendNow() {
  const tab = await getActiveZoomTab();
  if (!tab?.id) {
    return {
      ok: false,
      error: "Open a Zoom meeting tab first.",
    };
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, {
      type: "attendance:force-send",
    });
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "attendance:update") {
    sendAttendanceUpdate(message).then(sendResponse);
    return true;
  }

  if (message?.type === "popup:get-status") {
    checkBackend().then(() => sendResponse({ ok: true, snapshot: latestSnapshot }));
    return true;
  }

  if (message?.type === "popup:force-send") {
    forceSendNow().then(async (result) => {
      await checkBackend();
      sendResponse({ ...result, snapshot: latestSnapshot });
    });
    return true;
  }

  if (message?.type === "popup:open-dashboard") {
    chrome.tabs.create({ url: `${API_BASE_URL}/` }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
