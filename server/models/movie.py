#!/usr/bin/env python3
"""Holds class Movie (a local cache of TMDB metadata)."""
from sqlalchemy import Boolean, Column, Float, Integer, String

from models.base_model import Base, BaseModel


class Movie(BaseModel, Base):
    """Representation of a movie"""
    __tablename__ = 'movies'
    tmdb_id = Column(Integer, nullable=False, unique=True, index=True)
    title = Column(String(128), nullable=False)
    description = Column(String(2024), nullable=True)
    poster = Column(String(512), nullable=True)
    adult = Column(Boolean, nullable=True)
    popularity = Column(Float, nullable=True)
    year = Column(Integer, nullable=True)
    rating = Column(Float, nullable=True)
    language = Column(String(128), nullable=True)

    FIELDS = ('tmdb_id', 'title', 'description', 'poster', 'adult',
              'popularity', 'year', 'rating', 'language')
