#!/usr/bin/env python3
"""Contains class BaseModel, the parent of every persisted model."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String
from sqlalchemy.orm import declarative_base

import models

TIME_FORMAT = "%Y-%m-%dT%H:%M:%S.%f"
Base = declarative_base()

# Never serialise these attributes in API responses
PRIVATE_FIELDS = {"password", "_sa_instance_state"}


def utcnow():
    """Naive UTC timestamp (MySQL DATETIME has no timezone)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BaseModel:
    """Common columns and helpers shared by all models."""
    id = Column(String(60), primary_key=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def __init__(self, *args, **kwargs):
        """Initialise the model, ignoring unknown/protected keys."""
        for key, value in kwargs.items():
            if key in ("__class__", "created_at", "updated_at"):
                continue
            setattr(self, key, value)
        if not getattr(self, "id", None):
            self.id = str(uuid.uuid4())
        self.created_at = utcnow()
        self.updated_at = self.created_at

    def __repr__(self):
        return "[{}] ({})".format(self.__class__.__name__, self.id)

    __str__ = __repr__

    def save(self):
        """Persist the instance."""
        self.updated_at = utcnow()
        models.storage.new(self)
        models.storage.save()

    def to_dict(self):
        """Return a JSON-serialisable dict without private fields."""
        data = {k: v for k, v in self.__dict__.items()
                if k not in PRIVATE_FIELDS}
        for key in ("created_at", "updated_at"):
            if isinstance(data.get(key), datetime):
                data[key] = data[key].strftime(TIME_FORMAT)
        data["__class__"] = self.__class__.__name__
        return data

    def delete(self):
        """Delete the current instance from the storage."""
        models.storage.delete(self)
