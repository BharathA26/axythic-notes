# Axythic Note — Extension Skill Guide

## Purpose
Chrome Extension (Manifest V3) that captures live captions from Google Meet, Zoom, and Microsoft Teams, renders a floating React overlay with transcript/highlight/settings tabs, and sends the completed transcript to the Axythic Notes server for AI processing.

---

## Package Structure

```
packages/extensions/
├── public/
│   ├── manifest.json         # MV3 manifest — permissions, content scripts, SW
│   └── icons/                # icon16/48/128.png
├── src/
│   ├── background/index.ts   # Service worker — state, message routing, API call
│   ├── content/
│   │   ├── index.tsx         # Injects React root into meeting page
│   │   ├── App.tsx           # Main UI (Live / Highlights / Settings tabs)
│   │   └── observer.ts       # MutationObserver — caption extraction + dedup
│   ├── popup/
│   │   ├── index.tsx         # Popup bootstrap
│   │   └── Popup.tsx         # Popup UI (status + toggle button)
│   └── styles/index.css      # Tailwind + custom CSS vars scoped to #axythic-note-host
├── popup.html                # HTML entry for the extension popup
├── vite.config.ts            # vite-plugin-web-extension — multi-entry build
├── tailwind.config.js        # Custom an-* color tokens mapped to CSS vars
└── postcss.config.js
```

---

## Key Areas

### Content Script (`src/content/`)
- **`index.tsx`** — detects platform, creates `#axythic-note-host` div, mounts React
- **`App.tsx`** — state management for segments, highlights, search, auto-scroll, context invalidation
- **`observer.ts`** — `setupCaptionObserver()` uses `MutationObserver` to watch Google Meet's caption DOM; applies deduplication and word-level overlap detection via `extractNewTail()`

### Background Service Worker (`src/background/index.ts`)
- Manages shared `AppState` (isRecording, segments, participants)
- Message types: `START_RECORDING`, `STOP_RECORDING`, `PUSH_SEGMENT`, `PUSH_PARTICIPANTS`, `GET_STATUS`
- On `STOP_RECORDING`: POSTs transcript + participants to server at `http://localhost:5000/api/meetings`

### Popup (`src/popup/`)
- Simple status + start/stop toggle
- Communicates with content script via `chrome.tabs.sendMessage`

---

## Build

```bash
yarn build   # production — outputs to dist/
yarn dev     # watch mode
```

**Load in Chrome:** `chrome://extensions` → Developer Mode → Load unpacked → select `dist/`

Build uses `vite-plugin-web-extension` which:
- Builds `popup.html` as a standard Vite HTML entry
- Builds `src/background/index.ts` as an ES module service worker
- Builds `src/content/index.tsx` as an IIFE (required for content scripts)
- Rewrites `manifest.json` with correct output paths

---

## Styling
- All CSS scoped to `#axythic-note-host` — no style bleed into the meeting page
- Custom color tokens (`--an-bg`, `--an-accent`, etc.) defined in `index.css` and exposed as Tailwind classes via `tailwind.config.js`
- Dark theme: `#0d0f14` bg, `#4f6ef7` accent

---

## Data Flow
```
Observer detects caption → App.tsx segment state → background PUSH_SEGMENT
User stops recording → background STOP_RECORDING → POST /api/meetings → AI summary
```

---

## Coding Guidelines
- All UI inside `#axythic-note-host` — never mutate page styles outside this element
- Keep logic in React state + observer; avoid direct DOM mutations inside the host
- Use multiple DOM selector fallbacks for speaker extraction (Meet changes selectors frequently)
- `observer.ts` maintains `seenTexts` rolling cache to prevent duplicates
