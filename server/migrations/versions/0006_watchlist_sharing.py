"""Shareable watchlists: an unguessable public link id per user.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-19
"""
from alembic import op
import sqlalchemy as sa

revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users') as batch:
        batch.add_column(sa.Column('watchlist_share_id', sa.String(32),
                                   nullable=True))
        batch.create_unique_constraint('uq_users_watchlist_share_id',
                                       ['watchlist_share_id'])


def downgrade():
    with op.batch_alter_table('users') as batch:
        batch.drop_constraint('uq_users_watchlist_share_id', type_='unique')
        batch.drop_column('watchlist_share_id')
