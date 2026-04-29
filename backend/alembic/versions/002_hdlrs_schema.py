"""002 HDLRS schema additions

Revision ID: 002_hdlrs
Revises: 001_initial
Create Date: 2024-01-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "002_hdlrs"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add prerequisites and learning_objectives to content table
    op.add_column(
        "content",
        sa.Column("prerequisites", sa.JSON(), server_default="[]", nullable=False),
    )
    op.add_column(
        "content",
        sa.Column("learning_objectives", sa.JSON(), server_default="[]", nullable=False),
    )

    # Add learning_goals to users table
    op.add_column(
        "users",
        sa.Column("learning_goals", sa.JSON(), server_default="[]", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "learning_goals")
    op.drop_column("content", "learning_objectives")
    op.drop_column("content", "prerequisites")
