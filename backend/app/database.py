from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

# `check_same_thread=False` is required under SQLite: FastAPI serves sync route
# handlers from a thread pool, and by default a SQLite connection refuses to be
# used from any thread but the one that opened it. Each request still gets its
# own Session from `get_db`, so no connection is shared concurrently.
connect_args = {"check_same_thread": False} if settings.is_sqlite else {}

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
    echo=settings.database_echo,
    connect_args=connect_args,
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record) -> None:  # noqa: ANN001
    """Turn on foreign key enforcement for every SQLite connection.

    SQLite ships with foreign keys DISABLED, and the setting is per-connection
    rather than stored in the file — so it has to be re-issued on every
    connect, and any pooled connection that skips it silently ignores every
    constraint in the schema.

    This is not cosmetic. Each `ondelete="CASCADE"` in the models is a no-op
    without it: deleting a script set would leave its steps, objections,
    questions, rebuttals and versions behind, still pointing at a row that no
    longer exists. SQLAlchemy's ORM-level cascades cover deletes that go
    through a loaded relationship, but nothing else does — including the raw
    `DELETE FROM` sweep in `scripts/seed.py`.
    """
    if not settings.is_sqlite:
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
