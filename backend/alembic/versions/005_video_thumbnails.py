"""Add video and thumbnail urls

Revision ID: 005_video_thumbnails
Revises: 004_platform_config
Create Date: 2026-06-22 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_video_thumbnails'
down_revision = '004_platform_config'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('content', sa.Column('video_url', sa.String(length=1000), nullable=True))
    op.add_column('content', sa.Column('thumbnail_url', sa.String(length=1000), nullable=True))

def downgrade() -> None:
    op.drop_column('content', 'thumbnail_url')
    op.drop_column('content', 'video_url')
