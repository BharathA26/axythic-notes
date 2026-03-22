# Axythic Notes — Web Skill Guide

## Purpose
React + TypeScript SPA (Vite). Displays meeting history from the server — list view with stats, detail view with Summary / MOM / Action Items / Transcript tabs. Uses MUI v5 with a dark theme matching the extension brand.

---

## Package Structure

```
packages/web/
├── src/
│   ├── main.tsx              # React root mount
│   ├── App.tsx               # Router + MUI ThemeProvider (dark theme)
│   ├── pages/
│   │   ├── Dashboard.tsx     # Meeting list + stats cards
│   │   └── MeetingDetail.tsx # Tabbed detail view + action item status editor
│   ├── config/
│   │   └── firebase.ts       # Firebase client init (auth + firestore)
│   └── types/
│       └── meeting.ts        # Meeting + ActionItem interfaces
├── index.html
├── vite.config.ts
└── package.json
```

---

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | Dashboard | Meeting list with stats |
| `/meetings/:id` | MeetingDetail | Summary, MOM, Action Items, Transcript tabs |

---

## Theme
Defined in `App.tsx` via `createTheme`:
- Mode: `dark`
- Primary: `#4f6ef7` (indigo — matches extension accent)
- Secondary: `#22c55e` (green — matches extension recording indicator)
- Backgrounds: `#0d0f14` / `#13161e` (matches extension dark palette)
- Font: `Plus Jakarta Sans`

---

## Data Fetching
All data fetched from `http://localhost:5000/graphql` via the shared `src/lib/gql.ts` utility.

```ts
// usage
const data = await gql<{ meetings: Meeting[] }>(QUERY_STRING, variables);
```

Key operations:
- `GetMeetings` query → Dashboard meeting list
- `GetMeeting($id)` query → MeetingDetail
- `UpdateActionItem` mutation → inline status update from MeetingDetail
- `CreateMeeting` mutation → called from the Chrome extension (not from the web)

Never use raw `fetch` directly in pages — always go through `gql()` so error handling is consistent.

---

## Running

```bash
yarn dev     # Vite dev server on port 3000
yarn build   # tsc + vite build → dist/
```

Requires server to be running for data to appear.

---

## Coding Guidelines
- Keep API base URL as a `const API = 'http://localhost:5000/api'` at the top of each page file
- Use `Meeting` and `ActionItem` types from `src/types/meeting.ts` — do not redefine
- All pages use MUI components; do not mix in Tailwind or inline style hacks
- Fetch errors show a non-blocking `Alert` — never crash the whole page
