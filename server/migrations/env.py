"""Alembic environment: runs against an existing connection when the app
passes one (startup/tests), otherwise builds an engine from the env."""
from alembic import context
from sqlalchemy import create_engine

from models.base_model import Base
from models.engine.db_storage import database_url_from_env
import models.interaction  # noqa: F401  (register tables on metadata)
import models.movie  # noqa: F401
import models.user  # noqa: F401
import models.user_movie  # noqa: F401

config = context.config
target_metadata = Base.metadata


def run_offline():
    context.configure(url=database_url_from_env(),
                      target_metadata=target_metadata, literal_binds=True,
                      render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


def run_online():
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return
    engine = create_engine(database_url_from_env())
    with engine.begin() as conn:
        _run(conn)


def _run(connection):
    context.configure(connection=connection, target_metadata=target_metadata,
                      render_as_batch=True, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_offline()
else:
    run_online()
