# Script Builder — Frontend

React + TypeScript + Vite SPA for Script Builder, consuming the backend's
`/api/*` endpoints.

See the [repository README](../README.md) for what the app does, and
[STACK.md](../STACK.md) for the full dependency detail.

## Setup

```bash
npm install
```

**No environment file is needed.** The app references no `VITE_*` variables —
the dev server proxies `/api` to `http://127.0.0.1:8000` (configured in
`vite.config.ts`), and in production the SPA is served from the same origin as
the API, so the base URL is always relative.

## Development

```bash
npm run dev          # http://localhost:5173
```

Requires the backend running at `:8000` — `cd ../backend` and see the repository
README for the setup commands.

## Scripts

| Script | Does |
|---|---|
| `dev` | Vite dev server on `:5173`, proxying `/api` to `:8000` |
| `build` | `tsc -b && vite build` — type errors fail the build |
| `typecheck` | `tsc -b --noEmit`, without producing a bundle |
| `lint` | `oxlint` (config in `.oxlintrc.json`) — not ESLint |
| `preview` | Serve the production build locally |

> **There is no test suite here.** No Vitest, no test files. `typecheck` and
> `lint` are the only automated gates, so changes to component behaviour need
> checking by hand.

## Progressive web app

`vite-plugin-pwa` generates the manifest and service worker at build time.

The service worker is **disabled in `npm run dev`** (`devOptions.enabled:
false`), so offline behaviour, install prompts and the update flow cannot be
tested from the dev server — build and `npm run preview` instead. See
[LAUNCH.md](../LAUNCH.md#testing-the-pwa-and-mobile-layout).

Icons are drawn by `scripts/generate-icons.py`, which is stdlib-only Python — no
Pillow, no npm image toolchain. Re-run it after changing the mark.

## Structure

```
src/views/       One file per screen (Library, Run, Editor, Objections, Reports, Settings)
src/components/  Shared UI
src/store/       Zustand store — the whole app state
src/lib/         API client and helpers
```

There is **no router**. View switching is state in the store, driven by the
sidebar; the whole app is one session, so no screen has its own URL.
