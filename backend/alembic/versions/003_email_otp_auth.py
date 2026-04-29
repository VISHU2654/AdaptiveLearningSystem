"""003 email otp auth

Revision ID: 003_email_otp
Revises: 002_hdlrs
Create Date: 2026-04-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "003_email_otp"
down_revision = "002_hdlrs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_verified",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column("users", sa.Column("otp_code", sa.String(length=255), nullable=True))
    op.add_column(
        "users", sa.Column("otp_expires_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("users", sa.Column("otp_purpose", sa.String(length=50), nullable=True))
    op.add_column(
        "users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.alter_column("users", "is_verified", server_default=sa.text("false"))


def downgrade() -> None:
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "otp_purpose")
    op.drop_column("users", "otp_expires_at")
    op.drop_column("users", "otp_code")
    op.drop_column("users", "is_verified")
