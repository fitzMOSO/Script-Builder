# Running & Debugging in VS Code

Everything below is driven by [.vscode/launch.json](.vscode/launch.json) (debugging) and
[.vscode/tasks.json](.vscode/tasks.json) (commands). You should not need to type any of
the underlying commands by hand.

---

## TL;DR

| I want to... | Do this |
| --- | --- |
| Set up the database for the first time | `Ctrl+Shift+B` → **db: bootstrap** |
| Run the whole app with debugging | `F5` → **Full Stack: Backend + Frontend** |
| Run the app without debugging | `Ctrl+Shift+P` → *Run Task* → **dev: backend + frontend** |
| Wipe and reload the campaign data | *Run Task* → **db: reset + seed data** |
| Add a column / change a model | *Run Task* → **db: new migration**, review, then **db: migrate** |

Ports: backend **8000**, frontend **5173**. The frontend proxies `/api` → `127.0.0.1:8000`,
so you always browse to <http://localhost:5173>.

---

## First-time setup

Run these two, in order:

1. **Run Task → `setup: install all dependencies`**
   Installs backend packages from `requirements.txt` and frontend packages via npm.
   Skip if `backend/.venv` and `frontend/node_modules` already exist.

2. **`Ctrl+Shift+B`** (the default build task) → **`db: bootstrap (migrate + seed)`**
   Runs two steps in sequence:
   | Step | Effect |
   | --- | --- |
   | `db: migrate (upgrade head)` | Creates `backend/scriptbuilder.db` and applies all Alembic migrations. No-op if current. |
   | `db: reset + seed data` | **Wipes** all script data and reloads the demo sets. |

Both are safe to re-run. There is no "create database" step — SQLite creates the
file on first connection.

Then press **`F5`**.

---

## Debugging (`F5`)

Pick the config from the dropdown at the top of the **Run and Debug** panel.

### Full Stack: Backend + Frontend

The one you want most of the time. A compound that starts both configs below.
`stopAll` is on, so stopping one stops both.

Breakpoints work in Python *and* in `.tsx` files simultaneously.

### Backend: FastAPI (uvicorn)

Launches `uvicorn app.main:app --reload --port 8000` under **debugpy**.

- `justMyCode: false` — you can step into SQLAlchemy, FastAPI and Pydantic internals,
  not just your own code. Useful for tracing why a query or validation behaves oddly.
- `--reload` is on, so saving a `.py` file restarts the server. **Breakpoints survive
  the reload; the current debug session does not pause across it.**
- Reads `backend/.env` for connection settings.

Interactive API docs: <http://127.0.0.1:8000/docs>

### Frontend: Vite dev server

Runs `npm run dev`, waits for the server to report ready, then auto-attaches a Chrome
debugger via `serverReadyAction`.

Requires Chrome. If you use another browser, launch **`dev: backend + frontend`** as a
task instead and use your browser's own devtools.

### Frontend: Attach Chrome to running server

Use when Vite is *already* running (e.g. you started it as a task) and you just want a
debugger attached. Does not start the server itself.

### DB: create database / DB: reset + seed data

The two database scripts, run under the debugger rather than as plain tasks. Only useful
if you're changing the seed data and want to breakpoint through it — otherwise use the
tasks, which are faster.

---

## Tasks (`Ctrl+Shift+P` → *Tasks: Run Task*)

### Database

| Task | What it does |
| --- | --- |
| `db: bootstrap (create + migrate + seed)` | All three below, in order. Default build task. |
| `db: create database` | Creates `ScriptBuilder` if absent. Idempotent. |
| `db: migrate (upgrade head)` | Applies pending migrations. Idempotent. |
| `db: reset + seed data` | **Destructive.** Deletes every row, reloads from the docs. |
| `db: new migration (autogenerate)` | Prompts for a message, diffs models vs database. |
| `db: downgrade one revision` | Rolls back the most recent migration. |

### Servers

| Task | What it does |
| --- | --- |
| `dev: backend + frontend` | Both dev servers in parallel, no debugger. |
| `backend: dev server` | FastAPI with autoreload on 8000. |
| `frontend: dev server` | Vite on 5173. |

### Build & setup

| Task | What it does |
| --- | --- |
| `frontend: build` | Typechecks (`tsc -b`) then builds. Errors surface in the Problems panel. |
| `frontend: preview (test PWA)` | Builds, then serves the bundle. **The only way to test PWA behaviour.** |
| `assets: regenerate PWA icons` | Redraws `public/icons/*.png` from the generator script. |
| `setup: install all dependencies` | Backend pip install, then frontend npm install. |

---

## Testing the PWA and mobile layout

The service worker is **disabled in `npm run dev`** — precaching fights HMR and
produces confusing stale-asset bugs. Install prompts, offline mode and update
prompts only work against a real build:

**Run Task → `frontend: preview (test PWA)`**

Then in Chrome DevTools:

- *Application → Manifest* — icons, theme colour, and "Installability" should be clean.
- *Application → Service Workers* — one activated worker.
- *Network → Offline*, then reload — the app shell and the last-loaded script still render.

### On a real phone

Both dev and preview listen on the LAN (`host: true`), so the terminal prints a
**Network:** URL like `http://192.168.1.20:5173`. Open that on a phone connected
to the same Wi-Fi.

The phone talks only to Vite, which proxies `/api` to the backend — so the
backend's CORS allowlist does **not** need the phone's address.

> Install-to-home-screen requires a secure context. `localhost` counts; a plain
> `http://192.168.x.x` does not, so the install prompt won't appear over LAN.
> For that, use Chrome's device toolbar on the desktop, or port-forward
> `localhost:4173` to the phone via `chrome://inspect`.

---

## Changing the data model

1. Edit the models in `backend/app/models/`.
2. **Run Task → `db: new migration (autogenerate)`**, enter a short message.
3. **Read the generated file** in `backend/alembic/versions/`. Autogenerate is good at
   detecting added tables and columns, and unreliable at detecting renames — it will
   usually emit a drop plus an add, which loses data. Fix it by hand if so.
4. **Run Task → `db: migrate (upgrade head)`**.

---

## Troubleshooting

### "no such table" / the app starts but every list is empty

The database is a plain SQLite file at `backend/scriptbuilder.db`, created by
`alembic upgrade head`. There is no server to connect to, so the usual failure is not a
connection problem — it is that migrations never ran, or ran against a different file.

Rebuild it from scratch:

```
Run Task → db: bootstrap (migrate + seed)
```

If you suspect two files, check where it actually is:

```
cd backend
.venv/Scripts/python.exe -c "from app.config import get_settings; print(get_settings().database_url)"
```

The default path is resolved from the `backend/` package directory, not the current
working directory, precisely so `alembic` and `uvicorn` cannot disagree about it. You
only get a second file by overriding `DATABASE_URL` with a relative path in `.env`.

Deleting `backend/scriptbuilder.db` is always safe — it is gitignored and fully
rebuildable from the two commands above. Anything you authored in the UI goes with it.

### The backend debugger doesn't stop at breakpoints

Confirm VS Code is using the project interpreter —
`backend/.venv/Scripts/python.exe`. It's set in
[.vscode/settings.json](.vscode/settings.json), but a global Python extension setting can
override it. Check the interpreter shown in the status bar.

### Frontend loads but every API call fails

The backend isn't running, or isn't on 8000. The Vite proxy in
[frontend/vite.config.ts](frontend/vite.config.ts) forwards `/api` to
`http://127.0.0.1:8000` — if you change the backend port, change it there too.

Failures surface as red SweetAlert toasts in the top-right with the HTTP status.

### `db: reset + seed data` wiped data I wanted

There is no undo. That task deletes every row in all five tables by design. The seeded
content is reproducible from `backend/scripts/seed.py`; anything you authored in the UI
is not.

### Editing `backend/.env`

You almost certainly don't need to. Every setting has a working default in
`app/config.py`, and `.env` is optional — see `backend/.env.example` for what exists.

If you do set `DATABASE_URL`, note it takes **three** slashes for a relative path and
**four** for an absolute one:

```
DATABASE_URL=sqlite:///./scriptbuilder.db          # relative to the working directory
DATABASE_URL=sqlite:////c/data/scriptbuilder.db    # absolute
```

A relative path resolves against wherever the process started, which is how you end up
migrating one file and serving another.

---

## What runs where

```
                    F5 / tasks
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
  Vite  :5173                    uvicorn  :8000
  React + TS                      FastAPI
        │                               │
        └────── proxy /api ─────────────┘
                                        │
                                        ▼
                              SQLite (a file)
                       backend/scriptbuilder.db
```
