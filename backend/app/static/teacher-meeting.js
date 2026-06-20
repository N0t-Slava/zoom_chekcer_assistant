const meetingNumberInput = document.querySelector("#meeting-number");
const meetingPasswordInput = document.querySelector("#meeting-password");
const teacherNameInput = document.querySelector("#teacher-name");
const joinAsHostInput = document.querySelector("#join-as-host");
const joinButton = document.querySelector("#join-button");
const zoomLoginButton = document.querySelector("#zoom-login-button");
const zoomDisconnectButton = document.querySelector("#zoom-disconnect-button");
const sdkStatus = document.querySelector("#sdk-status");
const sdkMessage = document.querySelector("#sdk-message");
const oauthMessage = document.querySelector("#oauth-message");
const zoomUserMessage = document.querySelector("#zoom-user-message");
const meetingCheckMessage = document.querySelector("#meeting-check-message");
const attendanceMessage = document.querySelector("#attendance-message");

const ATTENDANCE_SYNC_INTERVAL_MS = 5000;

let sdkConfig = null;
let sdkScriptPromise = null;
let oauthAuthorized = false;
let attendanceSyncTimer = null;
let currentMeetingNumber = null;
let participantCache = new Map();

function setStatus(label, message) {
  sdkStatus.textContent = label;
  sdkMessage.textContent = message;
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
    code: pickNestedValue(error, [["errorCode"], ["code"], ["status"], ["result", "errorCode"], ["error", "errorCode"]]),
    message: pickNestedValue(error, [["errorMessage"], ["reason"], ["message"], ["result", "errorMessage"], ["result", "message"], ["error", "message"]]),
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

function zoomJoinContext(signaturePayload, role, zak) {
  return {
    meetingNumber: signaturePayload?.meeting_number || meetingNumberValue(),
    role,
    hostJoin: role === 1,
    hasZak: Boolean(zak),
    hasPasscode: Boolean(meetingPasswordInput.value),
    hasTeacherName: Boolean(teacherNameInput.value.trim()),
    sdkConfigured: Boolean(sdkConfig?.configured),
    sdkScriptUrl: sdkConfig?.sdk_js_url || "",
    origin: window.location.origin
  };
}

function meetingNumberValue() {
  return meetingNumberInput.value.replace(/\D+/g, "");
}

function setAttendanceStatus(message) {
  attendanceMessage.textContent = message;
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

  for (const key of ["attendeesList", "attendeeList", "attendees", "participants", "users", "result"]) {
    if (value[key]) {
      collectParticipantNames(value[key], names);
    }
  }

  return names;
}

async function sendAttendanceUpdate(meetingNumber, participants) {
  const response = await fetch("/attendance/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      meeting_id: meetingNumber,
      participants
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Attendance update failed: ${response.status} ${details}`);
  }

  return response.json();
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
    participants = normalizeParticipantNames([...participants, ...cachedParticipantNames()]);
    const result = await sendAttendanceUpdate(currentMeetingNumber, participants);
    setAttendanceStatus(
      `Attendance synced: ${result.active_count} active, ${result.unmatched_participants.length} unmatched, ${participants.length} names read.`
    );
    console.log("SDK attendance synced", { participants, result, attendeeResponse });
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
  rememberParticipantNames([teacherNameInput.value.trim() || "Teacher"]);
  if (attendanceSyncTimer) {
    clearInterval(attendanceSyncTimer);
  }

  syncAttendanceOnce();
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

  setStatus(
    "Ready",
    "Credentials are configured. Enter a meeting number to prepare the teacher join."
  );
  joinButton.disabled = false;
}

async function loadOAuthStatus() {
  const response = await fetch("/zoom/oauth/status");
  if (!response.ok) {
    throw new Error("Unable to load Zoom authorization status.");
  }

  const status = await response.json();
  oauthAuthorized = Boolean(status.authorized);
  oauthMessage.textContent = oauthAuthorized
    ? "Zoom is authorized. Host join can request a ZAK token."
    : "Authorize Zoom before joining as host.";
  if (!oauthAuthorized) {
    zoomUserMessage.textContent = "";
  } else if (status.email || status.display_name || status.user_id) {
    const label = status.display_name || status.email || status.user_id;
    zoomUserMessage.textContent = `Authorized as ${label}${status.email && status.email !== label ? ` <${status.email}>` : ""}.`;
  } else {
    zoomUserMessage.textContent = "Zoom is authorized, but the account identity could not be verified. Add a user profile read scope, save the app, then disconnect and authorize again.";
    console.warn("Zoom OAuth profile is unavailable", {
      profileError: status.profile_error,
      scopes: status.scopes || []
    });
  }
  joinAsHostInput.disabled = !oauthAuthorized;
  zoomLoginButton.textContent = oauthAuthorized ? "Authorize different account" : "Authorize Zoom";
  zoomDisconnectButton.hidden = !oauthAuthorized;
  if (oauthAuthorized) {
    joinAsHostInput.checked = true;
  } else {
    joinAsHostInput.checked = false;
  }
}

async function disconnectZoom() {
  zoomDisconnectButton.disabled = true;
  zoomLoginButton.disabled = true;
  try {
    const response = await fetch("/zoom/oauth/disconnect", { method: "POST" });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Unable to disconnect Zoom: ${details}`);
    }
    oauthAuthorized = false;
    oauthMessage.textContent = "Zoom authorization was cleared.";
    zoomUserMessage.textContent = "";
    joinAsHostInput.checked = false;
    joinAsHostInput.disabled = true;
    zoomDisconnectButton.hidden = true;
    zoomLoginButton.textContent = "Authorize Zoom";
  } catch (error) {
    console.error("Zoom disconnect failed", { error: zoomErrorDetails(error) });
    oauthMessage.textContent = error.message;
  } finally {
    zoomDisconnectButton.disabled = false;
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

function prepareClientJoin(signaturePayload, zak, role) {
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
        passWord: meetingPasswordInput.value,
        userName: teacherNameInput.value.trim() || "Teacher",
        success: () => {
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
          ].filter(Boolean).join(" | ");
          console.error("Zoom SDK join failed", {
            error: zoomErrorDetails(error),
            context: zoomJoinContext(signaturePayload, role, zak)
          });
          setStatus(
            "Join failed",
            message
          );
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
        context: zoomJoinContext(signaturePayload, role, zak)
      });
      setStatus("SDK failed", formatZoomError(error));
    }
  });
}

async function prepareJoin() {
  const meetingNumber = meetingNumberValue();
  if (!meetingNumber) {
    setStatus("Waiting", "Enter a Zoom meeting number first.");
    return;
  }

  joinButton.disabled = true;
  const joinAsHost = joinAsHostInput.checked;
  const role = joinAsHost ? 1 : 0;
  setStatus("Preparing", joinAsHost ? "Creating host signature and ZAK token..." : "Creating a Meeting SDK signature...");
  try {
    if (oauthAuthorized) {
      const meetingCheck = await checkZoomMeeting(meetingNumber);
      displayMeetingCheck(meetingCheck);
    }
    const signaturePayload = await createSignature(meetingNumber, role);
    const zak = joinAsHost ? await fetchZak() : null;
    setStatus("Loading", "Loading the Zoom Meeting SDK script...");
    await loadMeetingSdk(sdkConfig.sdk_js_url);
    prepareClientJoin(signaturePayload, zak, role);
  } catch (error) {
    console.error("Teacher join preparation failed", {
      error: zoomErrorDetails(error),
      context: {
        meetingNumber,
        role,
        hostJoin: joinAsHost,
        hasPasscode: Boolean(meetingPasswordInput.value),
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
joinButton.addEventListener("click", prepareJoin);
zoomLoginButton.addEventListener("click", () => {
  window.location.href = "/zoom/oauth/start?prompt=login";
});
zoomDisconnectButton.addEventListener("click", disconnectZoom);
loadConfig().catch((error) => {
  console.error(error);
  setStatus("Error", error.message);
  joinButton.disabled = true;
});
loadOAuthStatus().catch((error) => {
  console.error(error);
  oauthMessage.textContent = error.message;
});
