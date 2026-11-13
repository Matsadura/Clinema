"""Bring-your-own API keys: encrypted per-user provider keys.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_api_keys',
        sa.Column('id', sa.String(60), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.String(128),
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('provider', sa.String(20), nullable=False),
        sa.Column('secret', sa.Text(), nullable=False),
        sa.Column('last4', sa.String(8), nullable=False),
        sa.Column('status', sa.String(16), nullable=False),
        sa.Column('validated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('user_id', 'provider',
                            name='uq_user_api_keys_user_provider'),
    )


def downgrade():
    op.drop_table('user_api_keys')
