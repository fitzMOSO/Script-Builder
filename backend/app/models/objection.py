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
    # No ON DELETE action on purpose — script_steps already cascades from
    # script_sets, and a second cascade path into objections is rejected by
    # MSSQL. delete_step() clears this column explicitly instead.
    step_id: Mapped[int | None] = mapped_column(
        ForeignKey("script_steps.id"), nullable=True, index=True
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
