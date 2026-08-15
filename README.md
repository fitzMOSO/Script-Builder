# Script Builder

Call-centre script authoring tool — build ordered, versioned call scripts with merge variables.

## Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Frontend | React 19 + TypeScript + Vite                   |
| UI       | Tailwind CSS v4 + lucide-react                 |
| Alerts   | SweetAlert2 (confirm modals + toasts)          |
| State    | Zustand                                        |
| Forms    | React Hook Form + Zod                          |
| Backend  | Python 3.14 + FastAPI                          |
| ORM      | SQLAlchemy 2.0                                 |
| Database | Microsoft SQL Server (pyodbc + ODBC Driver 18) |
| Migrations | Alembic                                      |
| PWA      | vite-plugin-pwa (Workbox `generateSW`)         |

> Working in VS Code? See **[LAUNCH.md](LAUNCH.md)** — press `Ctrl+Shift+B` to set up the
> database and `F5` to run both servers with debugging. The commands below are the manual
> equivalents.

## Prerequisites

- Node.js 20+
- Python 3.11+
- SQL Server running locally, and ODBC Driver 18 installed

## Setup

### 1. SQL Server

The app targets the **LocalDB** instance (`(localdb)\MSSQLLocalDB`), which starts on
demand — there is no Windows service to start manually.

> Note: this machine also has a separate default `MSSQLSERVER` instance installed, but it
> fails to start with error 17051 and is **not** what this project uses.

Verify LocalDB is available with:

```
sqllocaldb info MSSQLLocalDB
```

### 2. Backend

```bash
cd backend
.venv/Scripts/python.exe scripts/create_db.py   # creates the ScriptBuilder database
.venv/Scripts/alembic.exe upgrade head          # creates the tables
.venv/Scripts/python.exe scripts/seed.py        # wipes and seeds 4 script sets
.venv/Scripts/uvicorn.exe app.main:app --reload
```

API runs at http://127.0.0.1:8000 — interactive docs at http://127.0.0.1:8000/docs

### Seed data

`scripts/seed.py` wipes all script data and reseeds three sets:

| id | Set | Status | Source |
| --- | --- | --- | --- |
| 1 | Card Billing Dispute - Inbound Service | published | Sample content (`scripts/sample_sets.py`) |
| 2 | Balance Transfer Offer - Outbound | published | Sample content |
| 3 | Early Past-Due Reminder - Collections | draft | Sample content |

All seed content is invented demo material — no real campaign, client or
product is represented. Every merge variable is filled in, so the Run screen
demonstrates substitution out of the box.

Connection settings live in `backend/.env` (see `.env.example`). It defaults to
`(localdb)\MSSQLLocalDB` with Windows trusted authentication.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173 and proxies `/api` to the backend.

## Screens

Client-side view switching from the sidebar — no router, the whole app is one session.
The nav is split by audience: **Use** is what an agent needs on a live call, **Build**
is authoring. Every Build screen operates on the script set named in the header, which
doubles as the set switcher.

| Group | Screen | What it does |
| --- | --- | --- |
| Use | **Script Library** | The single list of script sets — search, filter by draft/published, then **Use** (read-only), **Edit**, duplicate or delete. |
| Use | **Run Script** | Read-only call view: one step at a time in large type, merge variables substituted and highlighted, notes shown as agent guidance, and a searchable objection lookup. |
| Build | **Editor** | The step builder: ordered steps, editor, duplicate/delete/reorder, publish. |
| Build | **Objections** | Full CRUD for objections, their prospect phrasings and agent rebuttals. |
| Build | **Reports** | Steps by category, objections by severity, and a merge-variable index showing which steps use each one. |
| Build | **Settings** | Name/description, merge-variable values, unpublish, delete. |

## Progressive web app & mobile

The frontend installs to a home screen and works on phones.

- **Manifest + icons** — generated at build time by `vite-plugin-pwa`. The PNG icon
  set (192, 512, maskable 512, apple-touch 180) is drawn by
  `frontend/scripts/generate-icons.py`, which is stdlib-only Python — no Pillow, no
  npm image toolchain. Re-run it after changing the mark.
- **Offline** — the app shell is precached. `GET /api/*` uses NetworkFirst with a
  5s timeout, so a dropped connection falls back to the last loaded script set
  instead of an error page. Writes are not cached; they fail and the UI says so.
- **Updates** — `registerType: "prompt"`. A new build shows a "Reload" card rather
  than refreshing silently, because the step editor autosaves on blur and a
  surprise reload could drop an in-progress edit.
- **Layout** — single column below `lg`. The sidebar becomes a left drawer behind
  the hamburger, the step list becomes a bottom sheet, and Prev/Next move into a
  fixed bottom bar within thumb reach. Safe-area insets, `100dvh`, 44px touch
  targets and 16px form controls (which stop iOS zooming on focus) are handled in
  `src/index.css`.

Service workers are off in `npm run dev` — see [LAUNCH.md](LAUNCH.md#testing-the-pwa-and-mobile-layout)
for how to test properly.

## Data model

```
script_sets ──< script_steps
            └─< objections ──< objection_questions
                          └──< rebuttals
```

- `script_sets` — name, description, status (`draft` / `published`), version, `variable_values`, timestamps
- `script_steps` — title, statement no., content, notes, category, required/skip flags, position
- `objections` — title, severity (`MAJOR` / `MINOR`), position
- `objection_questions` / `rebuttals` — the prospect's phrasings and the agent's responses

Merge variables are written inline as `{{variable_name}}` and extracted from step
content on read, so there is no separate variables table to keep in sync. Their
**values** live in `script_sets.variable_values` — a JSON map stored in `NVARCHAR(MAX)`
(MSSQL has no native JSON type), edited under Settings and substituted by the Run
screen. Unset variables render as the raw `{{token}}` on an amber highlight so an
agent can see the gap rather than read the token aloud.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/script-sets` | List all script sets |
| POST | `/api/script-sets` | Create a script set |
| GET | `/api/script-sets/{id}` | Fetch a set with its ordered steps |
| PATCH | `/api/script-sets/{id}` | Update name/description/status/variable_values |
| POST | `/api/script-sets/{id}/publish` | Publish and bump version |
| DELETE | `/api/script-sets/{id}` | Delete a set and its steps |
| POST | `/api/script-sets/{id}/steps` | Append a step |
| PATCH | `/api/script-sets/{id}/steps/{stepId}` | Update a step |
| POST | `/api/script-sets/{id}/steps/{stepId}/duplicate` | Duplicate a step in place |
| DELETE | `/api/script-sets/{id}/steps/{stepId}` | Delete a step and renumber |
| POST | `/api/script-sets/{id}/steps/reorder` | Reorder all steps |
| GET | `/api/script-sets/{id}/objections` | List objections |
| POST | `/api/script-sets/{id}/objections` | Create an objection with questions and rebuttals |
| PATCH | `/api/script-sets/{id}/objections/{objId}` | Update an objection (questions/rebuttals are replaced wholesale) |
| DELETE | `/api/script-sets/{id}/objections/{objId}` | Delete an objection |
| GET | `/api/categories` | Step category options |
| GET | `/api/severities` | Objection severity options |
| GET | `/api/health` | Health check |
