#!/usr/bin/env python3
"""Holds class User"""
import hashlib
import hmac
import re

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from werkzeug.security import check_password_hash, generate_password_hash

from models.base_model import Base, BaseModel

# pbkdf2 hashes fit the existing VARCHAR(128) column (scrypt would not)
HASH_METHOD = "pbkdf2:sha256:600000"
_LEGACY_SHA256 = re.compile(r"^[0-9a-f]{64}$")


def hash_password(plain):
    """Return a salted, slow hash for ``plain``."""
    return generate_password_hash(plain, method=HASH_METHOD)


class User(BaseModel, Base):
    """Representation of a user"""
    __tablename__ = 'users'
    email = Column(String(128), nullable=False, unique=True, index=True)
    password = Column(String(128), nullable=False)
    first_name = Column(String(128), nullable=False)
    last_name = Column(String(128), nullable=False)
    avatar = Column(String(256), nullable=True)
    user_movies = relationship("User_Movie",
                               back_populates="user",
                               cascade="all, delete-orphan")

    def __init__(self, *args, **kwargs):
        """Initialise a user, hashing the plain-text password."""
        if kwargs.get("password"):
            kwargs["password"] = hash_password(kwargs["password"])
        super().__init__(*args, **kwargs)

    def check_password(self, plain):
        """Verify ``plain`` against the stored hash.

        Accounts created by the original prototype stored an unsalted
        SHA-256 digest; those are still accepted and transparently upgraded.
        Returns True when the password matches.
        """
        if not plain or not self.password:
            return False
        if _LEGACY_SHA256.match(self.password):
            digest = hashlib.sha256(plain.encode()).hexdigest()
            if hmac.compare_digest(digest, self.password):
                self.password = hash_password(plain)
                return True
            return False
        return check_password_hash(self.password, plain)

    def needs_rehash(self):
        """True if the stored hash uses an outdated scheme."""
        return not self.password.startswith(HASH_METHOD)
