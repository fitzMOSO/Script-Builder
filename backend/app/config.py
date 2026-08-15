from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# The backend package root — `backend/`. The default database file lives here
# rather than beside whatever directory the process happened to start in: a
# relative SQLite URL resolves against the current working directory, so
# `alembic upgrade head` run from `backend/` and a `uvicorn` started from the
# repo root would otherwise quietly create and migrate two different files.
BACKEND_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_ROOT / "scriptbuilder.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite, so the app runs from a fresh clone with no database server to
    # install and no driver to match. Point this at any SQLAlchemy URL to use
    # something else — nothing in the app layer is dialect-specific, since the
    # routers contain no raw SQL.
    database_url: str = f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"

    # Echo every statement to stdout. Useful when tracing query patterns, far
    # too noisy to leave on.
    database_echo: bool = False

    cors_origins: str = "http://localhost:5173"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
