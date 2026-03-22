import type { Segment } from "../content/observer";
import {
  getIdToken,
  signInWithChrome,
  signInWithEmail,
  signOut,
  getCurrentUser,
  serializeUser,
  onAuthChange,
} from "../lib/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002/graphql";

// ─── App State ───────────────────────────────────────────────────────────────

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

// ─── Keep auth state in sync — notify content scripts on change ──────────────

onAuthChange((user) => {
  const serialized = serializeUser(user);
  // Broadcast auth change to all Meet tabs so the content script can update
  chrome.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
    tabs.forEach((t) => {
      if (t.id) {
        chrome.tabs
          .sendMessage(t.id, { type: "AUTH_CHANGED", user: serialized })
          .catch(() => {});
      }
    });
  });
});

// ─── Icon click — toggle extension panel ─────────────────────────────────────

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

// ─── Helper: send authenticated GraphQL request ──────────────────────────────

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

// ─── Helper: save meeting to backend ─────────────────────────────────────────

async function saveMeetingToBackend(
  transcript: string,
  participants: string[],
  title: string,
  durationMinutes: number
) {
  const data = await gqlRequest(
    `mutation CreateMeeting($input: CreateMeetingInput!) {
       createMeeting(input: $input) { id title summary }
     }`,
    {
      input: { title, transcript, participants, duration: durationMinutes },
    }
  );

  if (data?.createMeeting) {
    console.log("[AxythicNote] Meeting saved:", data.createMeeting.id);

    // Notify all open Meet tabs that the meeting was saved
    chrome.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
      tabs.forEach((t) => {
        if (t.id) {
          chrome.tabs
            .sendMessage(t.id, {
              type: "MEETING_SAVED",
              meetingId: data.createMeeting.id,
              title: data.createMeeting.title,
            })
            .catch(() => {});
        }
      });
    });

    return data.createMeeting;
  }

  return null;
}

// ─── Message handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    // ── Transcript segment from content script ──────────────────────────────
    case "PUSH_SEGMENT":
      if (appState.isRecording) {
        appState.segments.push(msg);
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

    // ── Recording status ────────────────────────────────────────────────────
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
        .map((s) => `${s.speaker} [${s.timestamp}]: ${s.text}`)
        .join("\n");

      saveMeetingToBackend(
        transcript,
        appState.participants,
        `Meeting — ${new Date().toLocaleString()}`,
        durationMinutes
      ).catch((err) =>
        console.warn("[AxythicNote] Failed to save meeting:", err)
      );

      sendResponse({ success: true });
      break;
    }

    // ── SAVE_MEETING — called from the content script "Save" button ─────────
    case "SAVE_MEETING": {
      const { transcript, participants, title } = msg;
      saveMeetingToBackend(transcript, participants || [], title || "Meeting", 0)
        .then((result) => {
          sendResponse({
            success: !!result,
            meetingId: result?.id,
          });
        })
        .catch((err) => {
          console.warn("[AxythicNote] Failed to save meeting:", err);
          sendResponse({ success: false, error: String(err) });
        });
      break;
    }

    // ── Auth: check current status ──────────────────────────────────────────
    case "GET_AUTH_STATUS": {
      const user = getCurrentUser();
      sendResponse({
        isSignedIn: !!user,
        user: serializeUser(user),
      });
      break;
    }

    // ── Auth: Google sign-in via chrome.identity ────────────────────────────
    case "SIGN_IN_GOOGLE": {
      signInWithChrome()
        .then((user) =>
          sendResponse({ success: true, user: serializeUser(user) })
        )
        .catch((err) =>
          sendResponse({
            success: false,
            error: err?.message || String(err),
          })
        );
      break;
    }

    // ── Auth: Email / Password sign-in ──────────────────────────────────────
    case "SIGN_IN_EMAIL": {
      signInWithEmail(msg.email, msg.password)
        .then((user) =>
          sendResponse({ success: true, user: serializeUser(user) })
        )
        .catch((err) =>
          sendResponse({
            success: false,
            error: err?.code || err?.message || String(err),
          })
        );
      break;
    }

    // ── Auth: Sign out ──────────────────────────────────────────────────────
    case "SIGN_OUT": {
      signOut()
        .then(() => sendResponse({ success: true }))
        .catch((err) =>
          sendResponse({ success: false, error: String(err) })
        );
      break;
    }
  }

  return true; // Keep message channel open for async responses
});

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((_tabId) => {
  // Future: track per-tab recording state here
});
