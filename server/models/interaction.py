#!/usr/bin/env python3
"""Holds classes Interaction (event log) and TasteProfile (aggregate)."""
import json

from sqlalchemy import (Column, DateTime, Float, ForeignKey, Index, Integer,
                        String, Text)

from models.base_model import Base, BaseModel, utcnow

# Event name -> default weight used by the taste engine
EVENT_WEIGHTS = {
    'view': 0.5,          # opened the details of a movie
    'like': 2.0,
    'unlike': -2.0,       # cancels a previous like
    'dislike': -2.0,
    'undislike': 2.0,     # cancels a previous dislike
    'save': 1.0,
    'unsave': -1.0,
    'recommended': 0.0,   # shown to the user (used for de-duplication)
}


class Interaction(BaseModel, Base):
    """A timestamped, weighted user event on a movie."""
    __tablename__ = 'interactions'
    user_id = Column(String(128),
                     ForeignKey('users.id', ondelete='CASCADE'),
                     nullable=False)
    movie_id = Column(Integer, nullable=False)  # TMDB id
    event = Column(String(16), nullable=False)
    weight = Column(Float, nullable=False, default=0.0)
    # Optional JSON context, e.g. {"moods": ["Calm", "Curious"]}
    context = Column(String(512), nullable=True)

    __table_args__ = (
        Index('ix_interactions_user_created', 'user_id', 'created_at'),
        Index('ix_interactions_user_movie', 'user_id', 'movie_id'),
    )


class TasteProfile(Base):
    """Persisted aggregate of a user's interactions (one row per user)."""
    __tablename__ = 'taste_profiles'
    user_id = Column(String(128),
                     ForeignKey('users.id', ondelete='CASCADE'),
                     primary_key=True)
    profile = Column(Text, nullable=False, default='{}')
    interaction_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    def data(self):
        try:
            return json.loads(self.profile or '{}')
        except ValueError:
            return {}
