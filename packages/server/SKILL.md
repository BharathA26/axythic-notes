# Axythic Notes — Server Skill Guide

## Purpose
Express + TypeScript REST API. Receives meeting transcripts from the Chrome extension, processes them with OpenAI (summary, MOM, action items), stores results in Firestore, and sends email summaries via SMTP.

---

## Package Structure

```
packages/server/
├── src/
│   ├── index.ts                    # Express + Apollo Server bootstrap
│   ├── config/
│   │   └── firebase.ts             # Firebase Admin init — exports `db`
│   ├── graphql/
│   │   ├── schema.ts               # GraphQL type definitions (SDL)
│   │   └── resolvers.ts            # Query + Mutation resolvers
│   ├── services/
│   │   ├── ai.service.ts           # OpenAI GPT-4o-mini transcript processing
│   │   └── email.service.ts        # Nodemailer HTML email sender
│   └── types/
│       └── index.ts                # Meeting + ActionItem TS interfaces
├── .env.example                    # Required env vars template
└── tsconfig.json
```

---

## GraphQL API

Single endpoint: `POST /graphql`
Apollo Sandbox available at `http://localhost:5000/graphql` in dev.

### Queries
```graphql
# List meetings (newest first, limit 50)
query GetMeetings {
  meetings { id title createdAt participants summary actionItems { id status } }
}

# Single meeting
query GetMeeting($id: ID!) {
  meeting(id: $id) {
    id title createdAt participants summary mom transcript
    actionItems { id description assignee dueDate status }
  }
}
```

### Mutations
```graphql
# Create meeting — runs AI processing, optionally sends email
mutation CreateMeeting($input: CreateMeetingInput!) {
  createMeeting(input: $input) { id title summary actionItems { id description status } }
}
# input: { transcript: String!, title?: String, participants?: [String], emails?: [String] }

# Update action item status
mutation UpdateActionItem($meetingId: ID!, $actionId: ID!, $status: ActionStatus!) {
  updateActionItem(meetingId: $meetingId, actionId: $actionId, status: $status)
}
# ActionStatus: pending | in_progress | completed
```

---

## Services

### `ai.service.ts`
- Calls `gpt-4o-mini` with `response_format: { type: "json_object" }`
- Returns `{ summary, mom, actionItems[] }`
- Model can be changed by updating the `model` field in `processTranscript()`

### `email.service.ts`
- Builds HTML email with summary + action items table (dark theme matching brand)
- Skips silently if `SMTP_HOST` / `SMTP_USER` env vars are not set
- Transporter is created per-send (stateless, no connection pooling needed at this scale)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
PORT=5000
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=         # paste with literal \n chars
OPENAI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
```

---

## Running

```bash
yarn dev     # tsx watch — hot reload
yarn build   # tsc compile to dist/
yarn start   # node dist/index.js
```

---

## Coding Guidelines
- All async controller functions use try/catch and return typed error JSON
- Firebase `db` is a singleton exported from `config/firebase.ts` — never re-initialize
- Email sending is best-effort: failures log a warning but do not fail the request
- `FIREBASE_PRIVATE_KEY` in env uses literal `\n` — `firebase.ts` converts with `.replace(/\\n/g, '\n')`
