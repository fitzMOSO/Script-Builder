# Script Builder

Call-centre script authoring tool — build ordered, versioned call scripts with merge variables.

> **Portfolio demo, not open source.** The code is published so it can be read as a
> work sample, and cloned to run the demo locally. It is not offered for reuse.
> See [LICENSE](LICENSE).

## Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Frontend | React 19 + TypeScript + Vite                   |
| UI       | Tailwind CSS v4 + lucide-react                 |
| Alerts   | SweetAlert2 (confirm modals + toasts)          |
| State    | Zustand                                        |
| Forms    | React Hook Form + Zod                          |
| Backend  | Python 3.11+ + FastAPI (image pins 3.13)       |
| ORM      | SQLAlchemy 2.0                                 |
| Database | SQLite (no server to install)                  |
| Migrations | Alembic                                      |
| PWA      | vite-plugin-pwa (Workbox `generateSW`)         |

Full detail, with exact pins, in [STACK.md](STACK.md).

> Working in VS Code? See **[LAUNCH.md](LAUNCH.md)** — press `Ctrl+Shift+B` to set up the
> database and `F5` to run both servers with debugging. The commands below are the manual
> equivalents.

## Prerequisites

- Node.js 20+
- Python 3.11+

That is the whole list. The database is SQLite, so there is no server to install,
no driver to match and no connection string to configure.

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m alembic upgrade head   # creates backend/scriptbuilder.db
.venv/Scripts/python.exe scripts/seed.py           # wipes and seeds 3 script sets
.venv/Scripts/python.exe -m uvicorn app.main:app --reload
```

On macOS or Linux the interpreter is `.venv/bin/python` instead.

`alembic upgrade head` creates the database file itself — SQLite has no
"create database" step, the file appears on first connection. Delete
`backend/scriptbuilder.db` any time you want to start over; it is gitignored
and fully rebuilt by those two commands.

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

Settings live in `backend/.env` (see `.env.example`), but every one of them has
a working default — the file is optional. The database defaults to
`backend/scriptbuilder.db`, resolved relative to the package rather than the
current working directory, so `alembic` and `uvicorn` always agree on which
file they are using no matter where you launch them from.

### 2. Frontend

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
**values** live in `script_sets.variable_values` — a JSON map stored as `TEXT` and
marshalled by a small SQLAlchemy `TypeDecorator`, so the Python side is always a
plain dict. Edited under Settings, substituted by the Run screen. Unset variables render as the raw `{{token}}` on an amber highlight so an
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

## Deployment

Deployed to [Render](https://render.com) as a **single web service** that serves
both the API and the built frontend from one origin. That is why the frontend
calls relative `/api/...` paths and why CORS needs no production entry — the
browser never makes a cross-origin request.

| File | Role |
| --- | --- |
| `Dockerfile` | Two stages: Node builds the SPA, Python runs FastAPI and serves `frontend/dist` |
| `.dockerignore` | Keeps host artefacts (`node_modules`, `.venv`, `*.db`, `.env`) out of the image |
| `render.yaml` | Blueprint: Docker runtime, free plan, health check on `/api/health` |
| `docker-compose.yml` | Runs that same image locally — `docker compose up --build`, then <http://localhost:8000> |
| `backend/scripts/render-start.sh` | Entrypoint: `alembic upgrade head`, seed if empty, then `exec uvicorn` |

Why Docker rather than Render's native Python runtime: Vite needs Node to build
the frontend, and a Python runtime has no Node. Two services would mean two
origins, CORS configuration and a second cold start.

**To deploy:** Render dashboard → New → Blueprint → point it at this repo. The
repo is private, so Render needs GitHub access authorised.

### Data persistence

The free plan has no persistent disk, so `backend/scriptbuilder.db` lives in the
container's ephemeral filesystem. Every *deploy* starts from an empty database
that `render-start.sh` reseeds; edits survive restarts within a deploy but not
across deploys. Fine for a demo.

The seed step runs **only when the database is empty** — `seed.py` wipes all
script data, so running it on every boot would discard visitor edits whenever a
free instance woke from idle. To make data durable, add a disk mounted at
`/app/backend` (see the commented block in `render.yaml`); no code change is
needed.

### Serving the SPA locally

`backend/app/main.py` registers its static routes only when `frontend/dist`
exists, so local development is unaffected — Vite serves the app on `:5173` and
proxies `/api` to `:8000`. If you have run `npm run build`, the backend will
also serve that build on `:8000`, which is a quick way to check the production
serving path without Docker.

---

## License

**Portfolio demo, not open source.** You may read the code and clone it to run the
demo locally in order to evaluate the work. Any other use requires written
permission. See [LICENSE](LICENSE).
