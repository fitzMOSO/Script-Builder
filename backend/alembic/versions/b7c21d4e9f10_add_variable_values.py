"""add variable_values to script_sets

Revision ID: b7c21d4e9f10
Revises: 70084f4531ae
Create Date: 2026-08-11

Merge variables were extracted from step content but had nowhere to store a
value, so an agent reading the script saw the raw {{token}}. This adds a JSON
map of variable name -> value per script set.
"""

import sqlalchemy as sa
from alembic import op

revision = "b7c21d4e9f10"
down_revision = "70084f4531ae"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # server_default so the column can be NOT NULL without a separate backfill.
    op.add_column(
        "script_sets",
        sa.Column("variable_values", sa.Text(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("script_sets", "variable_values")
