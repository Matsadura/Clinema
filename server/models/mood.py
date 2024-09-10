#!/usr/bin/env python3
"""Holds class Mood"""
from models.base_model import BaseModel, Base
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship


class Mood(BaseModel, Base):
    """Representation of a user """
    __tablename__ = 'moods'
    mood = Column(String(24), nullable=False)
    recommendations = relationship("Recommendation",
                                   back_populates="mood",
                                   cascade="all, delete-orphan")

    def __init__(self, *args, **kwargs):
        """Initializes user"""
        super().__init__(*args, **kwargs)
