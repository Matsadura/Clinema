#!/usr/bin/python3
"""Initialize the models package.

The storage engine is created lazily by ``storage.reload()`` (called from the
Flask app factory) so importing models never opens a database connection.
"""
from models.engine.db_storage import DBStorage

storage = DBStorage()
