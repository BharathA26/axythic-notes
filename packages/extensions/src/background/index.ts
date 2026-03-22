import { Segment } from "../content/observer";
import { getIdToken } from "../lib/firebase";

const API_URL = "http://localhost:5002/graphql";

interface AppState {
  isRecording: boolean;
  meetingId: string | null;
  platform: string | null;
  startTime: number | null;
  segments: Segment[];
  participants: string[];
}

let appState: AppState = {
  isRecording: false,
  meetingId: null,
  platform: null,
  startTime: null,
  segments: [],
  participants: [],
};

// ── Icon click — toggle extension panel ──────────────────────────────────────
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: () => {
          const root = document.getElementById("axythic-note-host");
          if (root) window.dispatchEvent(new CustomEvent("axythic:toggle"));
        },
      })
      .catch(console.error);
  }
});

// ── Helper: send authenticated GraphQL request ────────────────────────────────
async function gqlRequest(query: string, variables: Record<string, unknown>) {
  const token = await getIdToken();
  if (!token) {
    console.warn("[AxythicNote] Not signed in — cannot send to backend.");
    return null;
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    console.error("[AxythicNote] GraphQL error:", json.errors[0].message);
    return null;
  }
  return json.data;
}

// ── Message handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "PUSH_SEGMENT":
      if (appState.isRecording) {
        appState.segments.push(msg);
        // Broadcast to other open Meet tabs
        chrome.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
          tabs.forEach((t) => {
            if (t.id && t.id !== sender.tab?.id) {
              chrome.tabs
                .sendMessage(t.id, { type: "NEW_SEGMENT", segment: msg })
                .catch(() => {});
            }
          });
        });
      }
      sendResponse({ success: true });
      break;

    case "PUSH_PARTICIPANTS":
      appState.participants = msg.participants || [];
      sendResponse({ success: true });
      break;

    case "GET_STATUS":
      sendResponse(appState);
      break;

    case "START_RECORDING":
      appState = {
        isRecording: true,
        meetingId: msg.meetingId || "meeting",
        platform: msg.platform || "meet",
        startTime: Date.now(),
        segments: [],
        participants: [],
      };
      sendResponse({ success: true });
      break;

    case "STOP_RECORDING": {
      appState.isRecording = false;

      const durationMinutes = appState.startTime
        ? Math.round((Date.now() - appState.startTime) / 60000)
        : 0;

      const transcript = appState.segments
        .map((s) => `${s.speaker} [${s.startTime}]: ${s.text}`)
        .join("\n");

      // Send to backend with JWT authentication
      gqlRequest(
        `mutation CreateMeeting($input: CreateMeetingInput!) {
           createMeeting(input: $input) { id title }
         }`,
        {
          input: {
            title: `Meeting — ${new Date().toLocaleString()}`,
            transcript,
            participants: appState.participants,
            duration: durationMinutes,
          },
        },
      )
        .then((data) => {
          if (data?.createMeeting) {
            console.log("[AxythicNote] Meeting saved:", data.createMeeting.id);
            // Notify the content script that meeting was saved
            chrome.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
              tabs.forEach((t) => {
                if (t.id) {
                  chrome.tabs
                    .sendMessage(t.id, {
                      type: "MEETING_SAVED",
                      meetingId: data.createMeeting.id,
                    })
                    .catch(() => {});
                }
              });
            });
          }
        })
        .catch((err) =>
          console.warn("[AxythicNote] Failed to save meeting:", err),
        );

      sendResponse({ success: true });
      break;
    }

    case "GET_AUTH_STATUS": {
      // Called by popup to check if user is signed in
      getIdToken().then((token) => {
        sendResponse({ isSignedIn: !!token });
      });
      break;
    }

    case "SIGN_IN": {
      // Called by popup when user clicks "Sign in"
      import("../lib/firebase").then(({ signInWithChrome }) => {
        signInWithChrome()
          .then((user) => sendResponse({ success: true, email: user.email }))
          .catch((err) =>
            sendResponse({ success: false, error: err.message || String(err) }),
          );
      });
      break;
    }
  }

  return true; // Keep message channel open for async responses
});

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((_tabId) => {
  // Future: track per-tab recording state here
});
