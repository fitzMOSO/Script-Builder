# Tech Stack

Script Builder — a FastAPI backend and a React SPA, shipped as **one** container
that serves both.

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI app, SQLAlchemy models, Alembic migrations, seed scripts |
| `frontend/` | React + TypeScript + Vite SPA (`script-builder-frontend`) |
| `Dockerfile` | Two-stage build: Node builds the SPA, Python serves API **and** SPA |
| `docker-compose.yml` | Local container run with a named volume for the database |
| `render.yaml` | Render Blueprint (single Docker web service) |

> Unlike CCTMS — which runs two SPAs as separate static sites alongside its API —
> Script Builder has **one origin**. `backend/app/main.py` mounts static routes
> only when `frontend/dist` exists, so the same code serves the SPA in the
> container and stays out of the way during local development.

---

## Frontend

### Core
- **React 19.2** + **TypeScript ~6.0**
- **Vite 8.2** (`tsc -b && vite build` for production)
- **No router.** View switching is client-side state from the sidebar; the whole
  app is a single session, so there are no deep links to preserve.

### UI & styling
- **Tailwind CSS 4.3** via the `@tailwindcss/vite` plugin — CSS-first config, no
  `tailwind.config.js`
- **lucide-react 1.31** icons
- **clsx** + **tailwind-merge** for conditional class composition
- **sweetalert2 11.26** for confirm modals and toasts

### State & forms
- **Zustand 5.0** — the single app store
- **React Hook Form 7.85** + **Zod 3.25** (via `@hookform/resolvers 5.7`)

### PWA
- **vite-plugin-pwa 1.3** with Workbox
- `registerType: "prompt"` — a new build offers a Reload card rather than
  refreshing silently, because the step editor autosaves on blur
- `GET /api/*` uses **NetworkFirst** with a 5s timeout; Google Fonts use
  **CacheFirst**; `navigateFallbackDenylist` keeps `/api/` off the SPA fallback
- Service worker is **disabled in dev** (`devOptions.enabled: false`)

### Tooling
- **oxlint 1.75** (config in `frontend/.oxlintrc.json`) — not ESLint
- Path alias `@` → `frontend/src`
- Dev server on `:5173`, proxying `/api` → `http://127.0.0.1:8000`

> **No test suite on the frontend.** There is no Vitest setup and no test files.
> Type safety comes from `tsc -b` in the build, which is the only automated gate
> the SPA currently has. Stated rather than implied — CCTMS has Vitest on both of
> its frontends, and the difference is real.

---

## Backend

### Core
- **Python 3.11+** (the runtime image pins **3.13-slim**)
- **FastAPI 0.141.1** on **uvicorn 0.52.1**
- **Pydantic 2.13.4** + **pydantic-settings 2.15.0** for schemas and config

### Database
- **SQLAlchemy 2.0.51** ORM
- **Alembic 1.19.1** migrations (`backend/alembic/`), currently a single
  revision: `0001_initial_schema`
- **SQLite** — a single file, no server, no driver to build

> The database path resolves from the **package directory**, not the current
> working directory (`BACKEND_ROOT` in `app/config.py`). That is deliberate:
> `alembic` and `uvicorn` are launched from different places often enough that a
> CWD-relative path silently produces two different database files.

Nothing in the application layer is dialect-specific, so the ORM would move to
Postgres without app changes — the migrations would need reviewing.

### Configuration
All settings have working defaults; `backend/.env` is optional. See
`backend/.env.example`. Only three keys are actually read:

| Key | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///<backend>/scriptbuilder.db` | Database location |
| `DATABASE_ECHO` | `false` | Log every SQL statement |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

> `pydantic-settings` is configured with `extra="ignore"`, so unknown keys in a
> local `.env` are silently dropped rather than raising. Convenient, but it means
> a typo'd key name fails quietly — check `app/config.py` if a setting seems to
> have no effect.

`CORS_ORIGINS` is empty in production because the SPA is served from the same
origin as the API, so no cross-origin request is made at all.

> **No backend test suite.** There is no pytest configuration and no test files.

---

## Deployment

`render.yaml` describes one Docker web service (`script-builder`, free plan,
Singapore region), health-checked at `/api/health`.

The container is built in two stages — `node:24-alpine` runs `npm ci && npm run
build`, then `python:3.13-slim` installs the backend requirements and copies the
built `frontend/dist` in. `backend/scripts/render-start.sh` migrates, then seeds
**only if the database is empty**.

The free plan has no persistent disk, so each *deploy* starts from an empty
database. Edits survive restarts within a deploy but not across deploys — fine
for a demo, and the commented disk block in `render.yaml` is the fix if that
changes.

The demo is served at **script-builder.fitzdev.studio**. Render matches custom
domains on the `Host` header, so the domain must stay registered under the
service's Custom Domains — DNS alone returns a 404 even when it resolves
correctly.
