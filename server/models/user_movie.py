#!/usr/bin/env python3
"""Holds class User_Movie"""
from models.base_model import BaseModel, Base
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship


class User_Movie(BaseModel, Base):
    """Representation of a vault """
    __tablename__ = 'user_movies'
    user_id = Column(String(128),
                     ForeignKey('users.id', ondelete='CASCADE'),
                     nullable=False)
    # movie_id = Column(String(128),
    #                   ForeignKey('movies.id', ondelete='CASCADE'),
    #                   nullable=False)
    movie_id = Column(Integer, nullable=False)
    save = Column(Boolean, nullable=True)
    like = Column(Boolean, nullable=True)
    # movie = relationship("Movie", back_populates="user_movies")
    user = relationship("User", back_populates="user_movies",)

    def __init__(self, *args, **kwargs):
        """initializes vault"""
        super().__init__(*args, **kwargs)
