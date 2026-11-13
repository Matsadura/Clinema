#!/usr/bin/env python3
"""Holds class User_Movie (a user's like/save flags for a movie)."""
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from models.base_model import Base, BaseModel


class User_Movie(BaseModel, Base):
    """Relationship between a user and a TMDB movie id."""
    __tablename__ = 'user_movies'
    user_id = Column(String(128),
                     ForeignKey('users.id', ondelete='CASCADE'),
                     nullable=False, index=True)
    # TMDB id of the movie (matches Movie.tmdb_id)
    movie_id = Column(Integer, nullable=False)
    save = Column(Boolean, nullable=True, default=False)
    like = Column(Boolean, nullable=True, default=False)
    user = relationship("User", back_populates="user_movies")
