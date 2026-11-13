"""'Seen' library flag.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user_movies') as batch:
        batch.add_column(sa.Column('seen', sa.Boolean(), nullable=True))


def downgrade():
    with op.batch_alter_table('user_movies') as batch:
        batch.drop_column('seen')
