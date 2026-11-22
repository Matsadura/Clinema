"""One library row per user and film.

Two quick requests for a film not yet in the library (e.g. Like, then
Watchlist) could both insert a row. Duplicates are merged first, keeping
the most recently updated row's like/dislike and any save/seen flag.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-22
"""
from alembic import op
import sqlalchemy as sa

revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None

NAME = 'uq_user_movies_user_movie'


def _merge_duplicates(conn):
    groups = conn.execute(sa.text(
        "SELECT user_id, movie_id FROM user_movies "
        "GROUP BY user_id, movie_id HAVING COUNT(*) > 1")).fetchall()
    for user_id, movie_id in groups:
        rows = conn.execute(sa.text(
            "SELECT id, save, seen FROM user_movies "
            "WHERE user_id = :u AND movie_id = :m "
            "ORDER BY updated_at DESC, created_at DESC"),
            {"u": user_id, "m": movie_id}).fetchall()
        keep, others = rows[0], rows[1:]
        conn.execute(sa.text(
            'UPDATE user_movies SET save = :save, seen = :seen '
            "WHERE id = :id"),
            {"id": keep.id, "save": any(r.save for r in rows),
             "seen": any(r.seen for r in rows)})
        conn.execute(sa.text("DELETE FROM user_movies WHERE id IN :ids")
                     .bindparams(sa.bindparam("ids", expanding=True)),
                     {"ids": [r.id for r in others]})


def upgrade():
    _merge_duplicates(op.get_bind())
    with op.batch_alter_table('user_movies') as batch:
        batch.create_unique_constraint(NAME, ['user_id', 'movie_id'])


def downgrade():
    with op.batch_alter_table('user_movies') as batch:
        batch.drop_constraint(NAME, type_='unique')
