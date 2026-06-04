const API_BASE_URL = "http://127.0.0.1:8000";
const LOG_PREFIX = "[Zoom Attendance Tracker]";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "attendance:update") {
    return false;
  }

  fetch(`${API_BASE_URL}/attendance/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      meeting_id: message.meetingId,
      participants: message.participants,
    }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Attendance update failed: ${response.status} ${details}`);
      }

      return response.json();
    })
    .then((payload) => {
      console.log(`${LOG_PREFIX} Attendance update sent to backend`, payload);
      sendResponse({ ok: true, payload });
    })
    .catch((error) => {
      console.error(`${LOG_PREFIX} Unable to send attendance update`, error);
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});
