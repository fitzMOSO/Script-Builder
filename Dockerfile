# Single image serving both the API and the built SPA from one origin.
#
# Why Docker rather than Render's native Python runtime: the frontend has to be
# compiled by Vite, which needs Node, and a Python runtime has no Node. Two
# services would mean two origins, CORS config and a second cold start for a
# demo app. One image with two build stages avoids all of it.

# ---------------------------------------------------------------------------
# Stage 1 — build the SPA. Nothing from this stage survives except dist/.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS frontend

WORKDIR /build

# Manifests first, so a source-only change reuses the cached install layer.
COPY frontend/package.json frontend/package-lock.json ./
# `npm ci` not `npm install`: it installs exactly the lockfile and fails if the
# lockfile and package.json disagree, which is what a reproducible build needs.
RUN npm ci

COPY frontend/ ./
# `npm run build` runs `tsc -b && vite build`, so a type error fails the image
# build rather than shipping.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — the runtime: Python, FastAPI, and the dist/ from above.
# ---------------------------------------------------------------------------
FROM python:3.13-slim

# PYTHONDONTWRITEBYTECODE: no .pyc litter in a container that is rebuilt anyway.
# PYTHONUNBUFFERED: without it Python block-buffers stdout when it is a pipe,
# and Render's log stream shows nothing until the buffer fills.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend /build/dist ./frontend/dist

# Render sets $PORT and routes to it. The default is only for `docker run`
# locally, where nothing sets it.
ENV PORT=8000
EXPOSE 8000

# Invoked through `sh` rather than directly: the repo is developed on Windows,
# which does not track a Unix executable bit, so the file would arrive here
# mode 644 and exec would fail with "permission denied".
CMD ["sh", "/app/backend/scripts/render-start.sh"]
