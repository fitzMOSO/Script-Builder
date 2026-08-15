"""add script_set_versions and objections.step_id

Revision ID: c93f5a1b6d28
Revises: b7c21d4e9f10
Create Date: 2026-08-11

Publishing previously only bumped a counter, so there was nothing to select or
delete. Each publish now stores a self-contained JSON snapshot. Objections also
gain an optional link to the step they usually come up at.
"""

import sqlalchemy as sa
from alembic import op

revision = "c93f5a1b6d28"
down_revision = "b7c21d4e9f10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "script_set_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("script_set_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("snapshot", sa.Text(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("SYSUTCDATETIME()"),
        ),
        sa.ForeignKeyConstraint(["script_set_id"], ["script_sets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_script_set_versions_script_set_id", "script_set_versions", ["script_set_id"]
    )

    # No ON DELETE action: script_steps already cascades from script_sets and
    # MSSQL rejects a second cascade path into objections. The API clears this
    # column when a step is deleted.
    op.add_column("objections", sa.Column("step_id", sa.Integer(), nullable=True))
    op.create_index("ix_objections_step_id", "objections", ["step_id"])
    op.create_foreign_key(
        "fk_objections_step_id_script_steps", "objections", "script_steps", ["step_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("fk_objections_step_id_script_steps", "objections", type_="foreignkey")
    op.drop_index("ix_objections_step_id", table_name="objections")
    op.drop_column("objections", "step_id")

    op.drop_index("ix_script_set_versions_script_set_id", table_name="script_set_versions")
    op.drop_table("script_set_versions")
