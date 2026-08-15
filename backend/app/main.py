from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import objections, script_sets
from app.schemas import CATEGORIES, SEVERITIES

settings = get_settings()

# Built frontend, when one exists. In production (Render) a single service
# serves both the API and the SPA from one origin, which is why the frontend
# can call relative "/api/..." paths and needs no CORS entry at all.
# Locally there is usually no build output at all — Vite serves the app on
# :5173 and proxies /api here — so the static routes below are registered only
# when the directory is actually present. If you have run `npm run build`, this
# backend will also serve that (possibly stale) build on :8000; the Vite dev
# server on :5173 is unaffected either way.
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

app = FastAPI(title="Script Builder API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(script_sets.router)
app.include_router(objections.router)


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/categories", tags=["meta"])
def categories() -> list[str]:
    return CATEGORIES


@app.get("/api/severities", tags=["meta"])
def severities() -> list[str]:
    return SEVERITIES


if FRONTEND_DIST.is_dir():
    # Hashed build assets. Mounted rather than routed so StaticFiles handles
    # range requests and conditional GETs for us.
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        """Serve the SPA, falling back to index.html.

        Registered LAST so every /api route above wins — FastAPI matches in
        declaration order, and this pattern would otherwise swallow them.

        A real file is served when one exists, which covers the PWA's
        service worker, manifest and icons at the root. Anything else gets
        index.html so a deep link or a refresh renders the app instead of a
        404.

        An unknown /api/* path must still 404 as JSON rather than silently
        returning HTML — a frontend fetch parsing an HTML error page as JSON
        produces a far more confusing failure than a plain 404.
        """
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        candidate = (FRONTEND_DIST / full_path).resolve()
        # Containment check: refuse paths that escape the build directory via
        # "../" before touching the filesystem.
        if candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST):
            return FileResponse(candidate)

        return FileResponse(FRONTEND_DIST / "index.html")
