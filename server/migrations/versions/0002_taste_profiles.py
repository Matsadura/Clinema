"""Preference learning: interactions, taste profiles, dislikes and movie
taste features.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

MOVIE_FEATURES = [
    ('genres', 256), ('director', 128), ('keywords', 512),
    ('countries', 128), ('tones', 256),
]


def upgrade():
    with op.batch_alter_table('movies') as batch:
        for name, length in MOVIE_FEATURES:
            batch.add_column(sa.Column(name, sa.String(length),
                                       nullable=True))

    with op.batch_alter_table('user_movies') as batch:
        batch.add_column(sa.Column('dislike', sa.Boolean(), nullable=True))

    op.create_table(
        'interactions',
        sa.Column('id', sa.String(60), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.String(128),
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('movie_id', sa.Integer(), nullable=False),
        sa.Column('event', sa.String(16), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('context', sa.String(512), nullable=True),
    )
    op.create_index('ix_interactions_user_created', 'interactions',
                    ['user_id', 'created_at'])
    op.create_index('ix_interactions_user_movie', 'interactions',
                    ['user_id', 'movie_id'])

    op.create_table(
        'taste_profiles',
        sa.Column('user_id', sa.String(128),
                  sa.ForeignKey('users.id', ondelete='CASCADE'),
                  primary_key=True),
        sa.Column('profile', sa.Text(), nullable=False),
        sa.Column('interaction_count', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('taste_profiles')
    op.drop_index('ix_interactions_user_movie', table_name='interactions')
    op.drop_index('ix_interactions_user_created', table_name='interactions')
    op.drop_table('interactions')
    with op.batch_alter_table('user_movies') as batch:
        batch.drop_column('dislike')
    with op.batch_alter_table('movies') as batch:
        for name, _ in reversed(MOVIE_FEATURES):
            batch.drop_column(name)
