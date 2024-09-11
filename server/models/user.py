#!/usr/bin/env python3
"""Holds class User"""
from models.base_model import BaseModel, Base
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
import hashlib


class User(BaseModel, Base):
    """Representation of a user """
    __tablename__ = 'users'
    email = Column(String(128), nullable=False)
    password = Column(String(128), nullable=False)
    first_name = Column(String(128), nullable=False)
    last_name = Column(String(128), nullable=False)
    avatar = Column(String(256), nullable=True)
    user_movies = relationship("User_Movie",
                               back_populates="user",
                               cascade="all, delete-orphan")

    def __init__(self, *args, **kwargs):
        """Initializes user"""
        kwargs["password"] = hashlib.sha256(
            kwargs["password"].encode()).hexdigest()
        super().__init__(*args, **kwargs)
