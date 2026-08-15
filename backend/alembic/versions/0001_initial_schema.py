"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-15

The whole schema in one revision.

This replaces the three MSSQL-era revisions that built it up incrementally
(initial schema -> variable_values -> versions and objection steps). Two of
them defaulted timestamps with `sysutcdatetime()`, which SQLite has no such
function for, and the third added a foreign key to an existing table, which
SQLite cannot do without a full table rebuild. Rather than port dead history,
the chain starts again here: no deployment ever ran those revisions, so there
is nothing in the wild to upgrade from.

Everything below is plain SQLAlchemy DDL with no dialect-specific types, so it
runs anywhere SQLAlchemy does.
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

# SQLite's CURRENT_TIMESTAMP is UTC, with whole-second resolution.
UTC_NOW = sa.text("CURRENT_TIMESTAMP")


def upgrade() -> None:
    op.create_table(
        "script_sets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("variable_values", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=UTC_NOW),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=UTC_NOW),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "script_steps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("script_set_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("statement_no", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False),
        sa.Column("allow_skip", sa.Boolean(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["script_set_id"], ["script_sets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_script_steps_script_set_id", "script_steps", ["script_set_id"])

    op.create_table(
        "script_set_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("script_set_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("snapshot", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=UTC_NOW),
        sa.ForeignKeyConstraint(["script_set_id"], ["script_sets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_script_set_versions_script_set_id", "script_set_versions", ["script_set_id"]
    )

    # `step_id` is created inline with the table rather than added afterwards:
    # SQLite cannot ALTER TABLE ADD CONSTRAINT, so a later `create_foreign_key`
    # would need a batch-mode table rebuild to do the same job.
    op.create_table(
        "objections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("script_set_id", sa.Integer(), nullable=False),
        sa.Column("step_id", sa.Integer(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["script_set_id"], ["script_sets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["step_id"],
            ["script_steps.id"],
            name="fk_objections_step_id_script_steps",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_objections_script_set_id", "objections", ["script_set_id"])
    op.create_index("ix_objections_step_id", "objections", ["step_id"])

    op.create_table(
        "objection_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("objection_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(length=500), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["objection_id"], ["objections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_objection_questions_objection_id", "objection_questions", ["objection_id"]
    )

    op.create_table(
        "rebuttals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("objection_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["objection_id"], ["objections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rebuttals_objection_id", "rebuttals", ["objection_id"])


def downgrade() -> None:
    # Reverse creation order — children before the parents they reference.
    op.drop_index("ix_rebuttals_objection_id", table_name="rebuttals")
    op.drop_table("rebuttals")
    op.drop_index("ix_objection_questions_objection_id", table_name="objection_questions")
    op.drop_table("objection_questions")
    op.drop_index("ix_objections_step_id", table_name="objections")
    op.drop_index("ix_objections_script_set_id", table_name="objections")
    op.drop_table("objections")
    op.drop_index("ix_script_set_versions_script_set_id", table_name="script_set_versions")
    op.drop_table("script_set_versions")
    op.drop_index("ix_script_steps_script_set_id", table_name="script_steps")
    op.drop_table("script_steps")
    op.drop_table("script_sets")
