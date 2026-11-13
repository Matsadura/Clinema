"""Alembic migrations are complete (no drift) and reversible."""
import sqlite3

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from models.base_model import Base
from models.engine.db_storage import alembic_config


@pytest.fixture
def engine(tmp_path):
    return create_engine(f"sqlite:///{tmp_path / 'm.db'}")


def migrate(engine, fn, revision):
    with engine.begin() as conn:
        fn(alembic_config(conn), revision)


def tables(engine):
    return set(inspect(engine).get_table_names())


def test_upgrade_matches_models(engine):
    migrate(engine, command.upgrade, "head")
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn),
                                Base.metadata)
    assert diff == []


def test_full_downgrade_and_reupgrade(engine):
    migrate(engine, command.upgrade, "head")
    migrate(engine, command.downgrade, "0001")
    assert {"interactions", "taste_profiles"}.isdisjoint(tables(engine))
    cols = {c["name"] for c in inspect(engine).get_columns("movies")}
    assert "genres" not in cols
    migrate(engine, command.downgrade, "base")
    assert tables(engine) == {"alembic_version"}
    migrate(engine, command.upgrade, "head")
    assert {"users", "movies", "user_movies", "interactions",
            "taste_profiles"} <= tables(engine)


def test_adopts_database_created_before_migrations(engine, tmp_path):
    # Schema as created by the previous release's create_all()
    db = sqlite3.connect(tmp_path / "m.db")
    db.executescript("""
        CREATE TABLE users (id VARCHAR(60) PRIMARY KEY, created_at DATETIME,
            updated_at DATETIME, email VARCHAR(128) NOT NULL,
            password VARCHAR(128) NOT NULL, first_name VARCHAR(128) NOT NULL,
            last_name VARCHAR(128) NOT NULL, avatar VARCHAR(256));
        CREATE TABLE movies (id VARCHAR(60) PRIMARY KEY, created_at DATETIME,
            updated_at DATETIME, tmdb_id INTEGER NOT NULL,
            title VARCHAR(128) NOT NULL, description VARCHAR(2024),
            poster VARCHAR(512), adult BOOLEAN, popularity FLOAT,
            year INTEGER, rating FLOAT, language VARCHAR(128));
        CREATE TABLE user_movies (id VARCHAR(60) PRIMARY KEY,
            created_at DATETIME, updated_at DATETIME,
            user_id VARCHAR(128) NOT NULL REFERENCES users(id),
            movie_id INTEGER NOT NULL, save BOOLEAN, "like" BOOLEAN);
        INSERT INTO users (id, email, password, first_name, last_name)
            VALUES ('u1', 'old@example.com', 'x', 'Old', 'User');
        INSERT INTO user_movies (id, user_id, movie_id, "like")
            VALUES ('um1', 'u1', 550, 1);
    """)
    db.close()

    migrate(engine, command.upgrade, "head")
    with engine.connect() as conn:
        rows = conn.exec_driver_sql(
            'SELECT movie_id, "like", dislike FROM user_movies').fetchall()
    assert rows == [(550, 1, None)]
    assert "interactions" in tables(engine)
