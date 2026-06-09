const POLL_INTERVAL_MS = 5000;
const LOG_PREFIX = "[Zoom Attendance Tracker]";
console.log(`${LOG_PREFIX} Content script loaded`, {
  href: window.location.href,
  isTopFrame: window.top === window,
});
const CONTROL_TEXT = new Set([
  "host",
  "co-host",
  "организатор",
  "соорганизатор",
  "rename",
  "переименовать",
  "mute",
  "unmute",
  "mute all",
  "unmute all",
  "выключить звук",
  "включить звук",
  "выключить звук у всех",
  "включить звук у всех",
  "more",
  "еще",
  "chat",
  "чат",
  "invite",
  "пригласить",
  "remove",
  "удалить",
  "ask to unmute",
  "put in waiting room",
  "lower hand",
  "raise hand",
  "поднять руку",
  "опустить руку",
  "admit",
  "claim host",
  "make co-host",
]);
const PARTICIPANT_PANEL_RE = /participants?|участники?/i;
const PARTICIPANT_CLASS_RE = /(participant|attendee|roster)/i;
const ROLE_ONLY_RE = /^\((host|co-host|guest|me|you|организатор|соорганизатор|гость|я|вы)(,\s*(host|co-host|guest|me|you|организатор|соорганизатор|гость|я|вы))*\)$/i;
const STATUS_TEXT_RE = /^(muted|unmuted|video off|video on|mute all|unmute all|more|guest|host|co-host)$/i;
const NAME_SELECTOR = [
  '[class*="display-name" i]',
  '[class*="user-name" i]',
  '[class*="username" i]',
  '[class*="participant-name" i]',
  '[class*="participants-item__name" i]',
  '[class*="participants-item__display-name" i]',
  '[class*="attendee-name" i]',
  '[aria-label*="participant" i]',
  '[aria-label*="участник" i]',
].join(", ");

function getMeetingId() {
  const url = new URL(window.location.href);
  const queryMeetingId = url.searchParams.get("mn") || url.searchParams.get("meeting_id");
  if (queryMeetingId) {
    return queryMeetingId;
  }

  const pathMeetingId = url.pathname
    .split("/")
    .find((segment) => /^\d{9,12}$/.test(segment));
  if (pathMeetingId) {
    return pathMeetingId;
  }

  return url.pathname.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "zoom-web-meeting";
}

function isLikelyMeetingPage() {
  const url = new URL(window.location.href);
  return (
    url.pathname.includes("/wc/") ||
    url.pathname.includes("/j/") ||
    Boolean(url.searchParams.get("mn")) ||
    url.pathname.split("/").some((segment) => /^\d{9,12}$/.test(segment))
  );
}

function looksLikeParticipantsPanel(element) {
  const text = element.getAttribute("aria-label") || element.innerText || "";
  const className = String(element.className || "");
  return PARTICIPANT_PANEL_RE.test(text) || PARTICIPANT_CLASS_RE.test(className);
}

function findParticipantsPanel() {
  const candidates = [
    ...document.querySelectorAll('[aria-label*="Participants" i]'),
    ...document.querySelectorAll('[aria-label*="Участники" i]'),
    ...document.querySelectorAll('[role="dialog"], [role="complementary"], aside, section'),
    ...document.querySelectorAll('[class*="participant" i], [class*="attendee" i], [class*="roster" i]'),
  ];

  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const rowCount = getParticipantRows(candidate).length;
    const nameCount = getNameElements(candidate).length;
    if (!looksLikeParticipantsPanel(candidate) && rowCount === 0 && nameCount === 0) {
      continue;
    }

    const score = rowCount * 2 + nameCount * 3 + (looksLikeParticipantsPanel(candidate) ? 10 : 0);
    if (score > bestScore) {
      bestMatch = candidate;
      bestScore = score;
    }
  }

  return bestMatch;
}

function getParticipantRows(panel) {
  const rows = [
    ...panel.querySelectorAll('[role="listitem"]'),
    ...panel.querySelectorAll('[role="option"]'),
    ...panel.querySelectorAll('[role="row"]'),
    ...panel.querySelectorAll('[data-participant-id]'),
    ...panel.querySelectorAll('[data-userid], [data-user-id]'),
    ...panel.querySelectorAll('[class*="participant" i]'),
    ...panel.querySelectorAll('[class*="participant-item" i], [class*="participants-item" i]'),
    ...panel.querySelectorAll('[class*="attendee-item" i]'),
    ...panel.querySelectorAll('[class*="roster" i] [class*="item" i]'),
  ];

  return [...new Set(rows)];
}

function getNameElements(panel) {
  return [...new Set([...panel.querySelectorAll(NAME_SELECTOR)])];
}

function sanitizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function cleanParticipantName(value) {
  return sanitizeLine(value)
    .replace(/\s+\((host|co-host|guest|me|you|организатор|соорганизатор|гость|я|вы)(,\s*(host|co-host|guest|me|you|организатор|соорганизатор|гость|я|вы))*\)$/i, "")
    .trim();
}

function isParticipantNameCandidate(value) {
  const line = sanitizeLine(value);
  const lowerLine = line.toLowerCase();

  return (
    line.length >= 2 &&
    !/^\d+$/.test(line) &&
    !CONTROL_TEXT.has(lowerLine) &&
    !PARTICIPANT_PANEL_RE.test(line) &&
    !ROLE_ONLY_RE.test(line) &&
    !STATUS_TEXT_RE.test(line)
  );
}

function pickNameFromRow(row) {
  const rawText = row.innerText || row.textContent || "";
  const lines = rawText
    .split("\n")
    .map(sanitizeLine)
    .filter(Boolean)
    .filter(isParticipantNameCandidate)
    .map(cleanParticipantName)
    .filter(isParticipantNameCandidate);

  const firstLine = lines[0] || null;
  if (!firstLine) {
    return null;
  }

  return firstLine;
}

function pickNameFromElement(element) {
  const ariaLabel = element.getAttribute("aria-label") || "";
  const rawText = element.innerText || element.textContent || ariaLabel;
  return pickNameFromRow({ innerText: rawText, textContent: rawText });
}

function extractParticipantNames() {
  let panel = findParticipantsPanel();
  if (!panel) {
    const fallbackNameElements = getNameElements(document.body);
    const fallbackNames = fallbackNameElements
      .map(pickNameFromElement)
      .filter(Boolean)
      .filter(isParticipantNameCandidate);

    if (fallbackNames.length) {
      console.log(`${LOG_PREFIX} Participants panel not found, using document-level name fallback.`, {
        nameElementCount: fallbackNameElements.length,
        names: [...new Set(fallbackNames)],
      });
      return [...new Set(fallbackNames)];
    }

    console.log(`${LOG_PREFIX} Participants panel not found. Open the Zoom participants panel to track attendance.`, {
      href: window.location.href,
      isTopFrame: window.top === window,
      bodyTextPreview: sanitizeLine((document.body?.innerText || "").slice(0, 500)),
    });
    return null;
  }

  const rows = getParticipantRows(panel);
  const rowNames = rows
    .map(pickNameFromRow)
    .filter(Boolean);
  const elementNames = getNameElements(panel)
    .map(pickNameFromElement)
    .filter(Boolean);
  const names = [...rowNames, ...elementNames]
    .filter(Boolean)
    .filter(isParticipantNameCandidate);

  if (!names.length) {
    console.log(`${LOG_PREFIX} Participants panel found, but no participant names were extracted.`, {
      panelTextPreview: sanitizeLine((panel.innerText || panel.textContent || "").slice(0, 500)),
      rowCount: rows.length,
      nameElementCount: getNameElements(panel).length,
      panelClassName: String(panel.className || ""),
    });
    return null;
  }

  return [...new Set(names)];
}

function sendAttendanceUpdate() {
  if (!isLikelyMeetingPage()) {
    console.log(`${LOG_PREFIX} Not a Zoom meeting page, skipping.`, window.location.href);
    return Promise.resolve({
      ok: false,
      error: "Not a Zoom meeting page.",
    });
  }

  const participants = extractParticipantNames();
  if (!participants) {
    return Promise.resolve({
      ok: false,
      error: "Participants panel not found or empty.",
    });
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: "attendance:update",
      meetingId: getMeetingId(),
      participants,
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`${LOG_PREFIX} Attendance update message failed`, chrome.runtime.lastError.message);
        resolve({
          ok: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }

      if (!response?.ok) {
        console.error(`${LOG_PREFIX} Attendance update rejected`, response?.error);
        resolve(response || {
          ok: false,
          error: "Attendance update rejected.",
        });
        return;
      }

      console.log(`${LOG_PREFIX} Attendance update sent`, {
        meetingId: getMeetingId(),
        participants,
      });
      resolve(response);
    });
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "attendance:force-send") {
    return false;
  }

  sendAttendanceUpdate().then(sendResponse);
  return true;
});

// Zoom Web updates its DOM often, so the selectors intentionally lean on accessible labels,
// generic roles, and participant-related text rather than brittle generated class names.
sendAttendanceUpdate();
setInterval(sendAttendanceUpdate, POLL_INTERVAL_MS);
