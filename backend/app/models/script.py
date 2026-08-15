import json
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, TypeDecorator, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JsonDict(TypeDecorator):
    """A dict stored as JSON text.

    MSSQL has no native JSON column type — it stores JSON in NVARCHAR(MAX) —
    so this keeps the Python side a plain dict without a driver-specific type.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):  # noqa: ANN001, ANN201
        return json.dumps(value or {})

    def process_result_value(self, value, dialect):  # noqa: ANN001, ANN201
        if not value:
            return {}
        try:
            parsed = json.loads(value)
        except ValueError:
            return {}
        return parsed if isinstance(parsed, dict) else {}


class ScriptSet(Base):
    __tablename__ = "script_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # Values for the {{merge_variables}} used in step content, e.g.
    # {"daily_benefit": "5,000"}. Without these an agent reads the raw token.
    variable_values: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.sysutcdatetime()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.sysutcdatetime(),
        onupdate=func.sysutcdatetime(),
    )

    steps: Mapped[list["ScriptStep"]] = relationship(
        back_populates="script_set",
        cascade="all, delete-orphan",
        order_by="ScriptStep.position",
        lazy="selectin",
    )
    objections: Mapped[list["Objection"]] = relationship(  # noqa: F821
        back_populates="script_set",
        cascade="all, delete-orphan",
        order_by="Objection.position",
        lazy="selectin",
    )
    versions: Mapped[list["ScriptSetVersion"]] = relationship(
        back_populates="script_set",
        cascade="all, delete-orphan",
        order_by="ScriptSetVersion.version.desc()",
    )


class ScriptSetVersion(Base):
    """A frozen copy of a script set taken at publish time.

    The snapshot is self-contained JSON rather than rows in script_steps: a
    version has to keep reading the same even after the live set is edited,
    renamed or has steps deleted, so it must not reference them.
    """

    __tablename__ = "script_set_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    script_set_id: Mapped[int] = mapped_column(
        ForeignKey("script_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    note: Mapped[str | None] = mapped_column(String(500))
    snapshot: Mapped[dict] = mapped_column(JsonDict, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.sysutcdatetime()
    )

    script_set: Mapped["ScriptSet"] = relationship(back_populates="versions")


class ScriptStep(Base):
    __tablename__ = "script_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    script_set_id: Mapped[int] = mapped_column(
        ForeignKey("script_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    statement_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="Opening")
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allow_skip: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    script_set: Mapped["ScriptSet"] = relationship(back_populates="steps")
