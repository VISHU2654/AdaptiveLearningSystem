"""004 platform config

Revision ID: 004_platform_config
Revises: 003_email_otp
Create Date: 2026-04-29 00:00:01.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "004_platform_config"
down_revision = "003_email_otp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_config",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index(op.f("ix_platform_config_key"), "platform_config", ["key"])


def downgrade() -> None:
    op.drop_index(op.f("ix_platform_config_key"), table_name="platform_config")
    op.drop_table("platform_config")
