from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Objection(Base):
    """A customer pushback an agent may hit, grouped under a severity band."""

    __tablename__ = "objections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    script_set_id: Mapped[int] = mapped_column(
        ForeignKey("script_sets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional: the step this objection typically comes up at, so the run view
    # can surface it in context. NULL means "can come up at any point".
    #
    # ON DELETE SET NULL: losing the step must not take the objection with it.
    # The pushback is still real, it just no longer has a home step.
    #
    # This previously had no ON DELETE action at all — script_steps already
    # cascades from script_sets, and SQL Server rejects a second cascade path
    # into the same table. SQLite has no such restriction, so the constraint
    # can now say what was always meant.
    #
    # `delete_step()` still clears the column explicitly rather than leaning on
    # this. The constraint only fixes rows on disk; objections already loaded
    # into the open Session would keep a stale `step_id` until refreshed.
    step_id: Mapped[int | None] = mapped_column(
        ForeignKey("script_steps.id", ondelete="SET NULL"), nullable=True, index=True
    )
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="MAJOR")
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    script_set: Mapped["ScriptSet"] = relationship(back_populates="objections")  # noqa: F821
    questions: Mapped[list["ObjectionQuestion"]] = relationship(
        back_populates="objection",
        cascade="all, delete-orphan",
        order_by="ObjectionQuestion.position",
        lazy="selectin",
    )
    rebuttals: Mapped[list["Rebuttal"]] = relationship(
        back_populates="objection",
        cascade="all, delete-orphan",
        order_by="Rebuttal.position",
        lazy="selectin",
    )


class ObjectionQuestion(Base):
    """A verbatim phrasing a customer might use to raise the objection."""

    __tablename__ = "objection_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    objection_id: Mapped[int] = mapped_column(
        ForeignKey("objections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    objection: Mapped["Objection"] = relationship(back_populates="questions")


class Rebuttal(Base):
    """An approved agent response to an objection."""

    __tablename__ = "rebuttals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    objection_id: Mapped[int] = mapped_column(
        ForeignKey("objections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    objection: Mapped["Objection"] = relationship(back_populates="rebuttals")
