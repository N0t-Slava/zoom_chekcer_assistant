const meetingNumberInput = document.querySelector("#meeting-number");
const meetingPasswordInput = document.querySelector("#meeting-password");
const teacherNameInput = document.querySelector("#teacher-name");
const joinAsHostInput = document.querySelector("#join-as-host");
const joinButton = document.querySelector("#join-button");
const zoomLoginButton = document.querySelector("#zoom-login-button");
const sdkStatus = document.querySelector("#sdk-status");
const sdkMessage = document.querySelector("#sdk-message");
const oauthMessage = document.querySelector("#oauth-message");

let sdkConfig = null;
let sdkScriptPromise = null;
let oauthAuthorized = false;

function setStatus(label, message) {
  sdkStatus.textContent = label;
  sdkMessage.textContent = message;
}

function formatZoomError(error) {
  if (!error) {
    return "Unknown Zoom SDK error.";
  }
  if (typeof error === "string") {
    return error;
  }

  const fields = [
    error.errorCode ? `code ${error.errorCode}` : "",
    error.errorMessage || error.reason || error.message || "",
    error.method ? `method ${error.method}` : ""
  ].filter(Boolean);

  if (fields.length) {
    return fields.join(" | ");
  }

  try {
    return JSON.stringify(error);
  } catch (_jsonError) {
    return String(error);
  }
}

function meetingNumberValue() {
  return meetingNumberInput.value.replace(/\D+/g, "");
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
  joinAsHostInput.disabled = !oauthAuthorized;
  if (!oauthAuthorized) {
    joinAsHostInput.checked = false;
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

function prepareClientJoin(signaturePayload, zak) {
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
        },
        error: (error) => {
          console.error(error);
          setStatus("Join failed", formatZoomError(error));
        }
      };
      if (zak) {
        joinOptions.zak = zak;
      }
      zoomMtg.join(joinOptions);
    },
    error: (error) => {
      console.error(error);
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
    const signaturePayload = await createSignature(meetingNumber, role);
    const zak = joinAsHost ? await fetchZak() : null;
    setStatus("Loading", "Loading the Zoom Meeting SDK script...");
    await loadMeetingSdk(sdkConfig.sdk_js_url);
    prepareClientJoin(signaturePayload, zak);
  } catch (error) {
    console.error(error);
    setStatus("Error", error.message);
  } finally {
    joinButton.disabled = false;
  }
}

joinButton.disabled = true;
joinAsHostInput.disabled = true;
joinButton.addEventListener("click", prepareJoin);
zoomLoginButton.addEventListener("click", () => {
  window.location.href = "/zoom/oauth/start";
});
loadConfig().catch((error) => {
  console.error(error);
  setStatus("Error", error.message);
  joinButton.disabled = true;
});
loadOAuthStatus().catch((error) => {
  console.error(error);
  oauthMessage.textContent = error.message;
});
