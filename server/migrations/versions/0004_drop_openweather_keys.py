"""Remove stored OpenWeather keys (the weather feature was removed).

These are encrypted secrets for a service Clinema no longer calls, so they
are deleted rather than kept. The schema is unchanged; the deleted keys
cannot be restored by a downgrade (users would need to re-enter them).

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    keys = sa.table('user_api_keys', sa.column('provider', sa.String))
    op.execute(keys.delete().where(keys.c.provider == 'openweather'))


def downgrade():
    # Data-only migration: nothing to restore.
    pass
