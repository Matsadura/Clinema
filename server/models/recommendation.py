#!/usr/bin/env python3
"""Holds class Recommendation"""
from models.base_model import BaseModel, Base
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship


class Recommendation(BaseModel, Base):
    """Representation of a vault """
    __tablename__ = 'Recommendation'
    user_id = Column(String(128),
                     ForeignKey('users.id', ondelete='CASCADE'),
                     nullable=False)
    mood_id = Column(String(128),
                     ForeignKey('moods.id', ondelete='CASCADE'),
                     nullable=False)
    weather = Column(String(128), nullable=False)
    recommendaton = Column(String(128), nullable=True)
    seen = Column(Boolean, nullable=False)
    like = Column(Boolean, nullable=False)
    mood = relationship("Mood", back_populates="recommendations")
    user = relationship("User", back_populates="recommendations",)

    def __init__(self, *args, **kwargs):
        """initializes vault"""
        super().__init__(*args, **kwargs)
