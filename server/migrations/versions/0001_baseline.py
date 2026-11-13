"""Baseline schema (users, movies, user_movies).

Databases created before migrations existed (via ``create_all``) already
have these tables; they are detected and left untouched so this revision
can be stamped onto them safely.

Revision ID: 0001
Revises:
Create Date: 2026-11-13
"""
from alembic import op
import sqlalchemy as sa

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def _existing_tables():
    return set(sa.inspect(op.get_bind()).get_table_names())


def upgrade():
    existing = _existing_tables()

    if 'users' not in existing:
        op.create_table(
            'users',
            sa.Column('id', sa.String(60), primary_key=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('email', sa.String(128), nullable=False),
            sa.Column('password', sa.String(128), nullable=False),
            sa.Column('first_name', sa.String(128), nullable=False),
            sa.Column('last_name', sa.String(128), nullable=False),
            sa.Column('avatar', sa.String(256), nullable=True),
        )
        op.create_index('ix_users_email', 'users', ['email'], unique=True)

    if 'movies' not in existing:
        op.create_table(
            'movies',
            sa.Column('id', sa.String(60), primary_key=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('tmdb_id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(128), nullable=False),
            sa.Column('description', sa.String(2024), nullable=True),
            sa.Column('poster', sa.String(512), nullable=True),
            sa.Column('adult', sa.Boolean(), nullable=True),
            sa.Column('popularity', sa.Float(), nullable=True),
            sa.Column('year', sa.Integer(), nullable=True),
            sa.Column('rating', sa.Float(), nullable=True),
            sa.Column('language', sa.String(128), nullable=True),
        )
        op.create_index('ix_movies_tmdb_id', 'movies', ['tmdb_id'],
                        unique=True)

    if 'user_movies' not in existing:
        op.create_table(
            'user_movies',
            sa.Column('id', sa.String(60), primary_key=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('user_id', sa.String(128),
                      sa.ForeignKey('users.id', ondelete='CASCADE'),
                      nullable=False),
            sa.Column('movie_id', sa.Integer(), nullable=False),
            sa.Column('save', sa.Boolean(), nullable=True),
            sa.Column('like', sa.Boolean(), nullable=True),
        )
        op.create_index('ix_user_movies_user_id', 'user_movies',
                        ['user_id'])


def downgrade():
    op.drop_table('user_movies')
    op.drop_table('movies')
    op.drop_table('users')
