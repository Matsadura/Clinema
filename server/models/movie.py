#!/usr/bin/env python3
"""Holds class Movie"""
from models.base_model import BaseModel, Base
from sqlalchemy import Column, String, Boolean, Integer, Float
from sqlalchemy.orm import relationship


class Movie(BaseModel, Base):
    """Representation of a user """
    __tablename__ = 'movies'
    tmdb_id = Column(Integer, nullable=False)
    title = Column(String(128), nullable=False)
    description = Column(String(2024), nullable=True)
    poster = Column(String(512), nullable=True)
    adult = Column(Boolean, nullable=True)
    popularity = Column(Float, nullable=True)
    year = Column(Integer, nullable=True)
    rating = Column(Float, nullable=True)
    language = Column(String(128), nullable=True)
    # user_movies = relationship("User_Movie",
    #                            back_populates="movie",
    #                            cascade="all, delete-orphan")

    def __init__(self, *args, **kwargs):
        """Initializes user"""
        super().__init__(*args, **kwargs)