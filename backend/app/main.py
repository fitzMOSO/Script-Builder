from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import objections, script_sets
from app.schemas import CATEGORIES, SEVERITIES

settings = get_settings()

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
