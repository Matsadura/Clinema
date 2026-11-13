#!/usr/bin/env python3
"""Contains the class DBStorage, a thin wrapper around a SQLAlchemy session."""
import logging
import os
import time
from os import getenv
from urllib.parse import quote_plus

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.pool import StaticPool

from models.base_model import Base
from models.interaction import Interaction, TasteProfile
from models.movie import Movie
from models.user import User
from models.user_movie import User_Movie

log = logging.getLogger(__name__)

classes = {"Movie": Movie, "User_Movie": User_Movie, "User": User,
           "Interaction": Interaction}


def database_url_from_env():
    """Build the database URL from environment variables."""
    url = getenv("DATABASE_URL")
    if url:
        return url
    user = quote_plus(getenv("MYSQL_USER", "clinema"))
    password = quote_plus(getenv("MYSQL_PASSWORD", ""))
    host = getenv("DB_HOST", "localhost")
    port = getenv("DB_PORT", "3306")
    name = getenv("MYSQL_DATABASE", "clinema")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}" \
        "?charset=utf8mb4"


def alembic_config(connection=None):
    """Alembic config pointing at server/migrations."""
    from alembic.config import Config
    root = os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))))
    config = Config(os.path.join(root, "alembic.ini"))
    config.set_main_option("script_location",
                           os.path.join(root, "migrations"))
    if connection is not None:
        config.attributes["connection"] = connection
    return config


def run_migrations(engine, revision="head"):
    """Upgrade the database schema to ``revision``."""
    from alembic import command
    with engine.begin() as connection:
        command.upgrade(alembic_config(connection), revision)


class DBStorage:
    """Interacts with the relational database."""

    def __init__(self):
        self._engine = None
        self._session = None

    # -- lifecycle ---------------------------------------------------------
    def reload(self, url=None, retries=10, delay=2.0, migrate=True):
        """Create the engine, bring the schema up to date and open a session.

        Schema changes are applied with Alembic migrations (``migrate``);
        retries while the database is still starting (e.g. in compose).
        """
        url = url or database_url_from_env()
        kwargs = {"pool_pre_ping": True}
        if url.startswith("sqlite"):
            kwargs = {"connect_args": {"check_same_thread": False},
                      "poolclass": StaticPool}
        else:
            kwargs["pool_recycle"] = 280
        self._engine = create_engine(url, **kwargs)

        for attempt in range(1, retries + 1):
            try:
                if migrate:
                    run_migrations(self._engine)
                else:
                    Base.metadata.create_all(self._engine)
                break
            except OperationalError:
                if attempt == retries:
                    raise
                log.warning("Database not ready (attempt %d/%d), retrying",
                            attempt, retries)
                time.sleep(delay)

        factory = sessionmaker(bind=self._engine, expire_on_commit=False)
        self._session = scoped_session(factory)

    @property
    def session(self):
        """The thread-local SQLAlchemy session."""
        return self._session

    def close(self):
        """Release the thread-local session."""
        if self._session is not None:
            self._session.remove()

    def ping(self):
        """Return True if the database answers a trivial query."""
        try:
            self._session.execute(text("SELECT 1"))
            return True
        except Exception:  # noqa: BLE001 - health check must not raise
            self._session.rollback()
            return False

    def drop_all(self):
        """Empty every table (tests only)."""
        self._session.remove()
        with self._engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())

    # -- unit of work ------------------------------------------------------
    def new(self, obj):
        """Add the object to the current database session."""
        self._session.add(obj)

    def save(self):
        """Commit the session, rolling back on failure."""
        try:
            self._session.commit()
        except Exception:
            self._session.rollback()
            raise

    def rollback(self):
        """Roll back the current transaction."""
        self._session.rollback()

    def delete(self, obj=None):
        """Mark ``obj`` for deletion."""
        if obj is not None:
            self._session.delete(obj)

    # -- queries -----------------------------------------------------------
    def all(self, cls=None):
        """Return {"Class.id": obj} for one class or all classes."""
        result = {}
        for name, klass in classes.items():
            if cls is None or cls is klass or cls == name:
                for obj in self._session.query(klass).all():
                    result[f"{name}.{obj.id}"] = obj
        return result

    def all_list(self, cls):
        """Return every instance of ``cls`` as a list."""
        return self._session.query(cls).all()

    def all_list_specific(self, cls, attribute, value):
        """Return instances of ``cls`` whose ``attribute`` equals ``value``."""
        return self._session.query(cls).filter(
            getattr(cls, attribute) == value).all()

    def get(self, cls, id):
        """Return the object of ``cls`` with primary key ``id`` or None."""
        if id is None:
            return None
        return self._session.get(cls, id)

    def get_specific(self, cls, attribute, value):
        """Return the first ``cls`` whose ``attribute`` equals ``value``."""
        return self._session.query(cls).filter(
            getattr(cls, attribute) == value).first()

    def get_specific_double(self, cls, attr_1, val_1, attr_2, val_2):
        """Return the first ``cls`` matching two attribute filters."""
        return self._session.query(cls).filter(
            getattr(cls, attr_1) == val_1,
            getattr(cls, attr_2) == val_2).first()

    def count(self, cls=None):
        """Count objects of ``cls`` (or of every class)."""
        if cls is not None:
            return self._session.query(cls).count()
        return sum(self._session.query(k).count() for k in classes.values())
