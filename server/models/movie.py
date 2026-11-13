#!/usr/bin/env python3
"""Holds class Movie (a local cache of TMDB metadata)."""
from sqlalchemy import Boolean, Column, Float, Integer, String

from models.base_model import Base, BaseModel

# Multi-valued attributes are stored as "|"-separated strings to stay
# portable across MySQL and SQLite; to_dict() exposes them as lists.
LIST_FIELDS = ('genres', 'keywords', 'countries', 'tones')
LIST_LIMITS = {'genres': 256, 'keywords': 512, 'countries': 128,
               'tones': 256}


def join_list(values, limit):
    """Serialise a list of strings into a bounded "|"-separated string."""
    if not values:
        return None
    if isinstance(values, str):
        values = [values]
    out, seen = [], set()
    for value in values:
        value = str(value).replace("|", "/").strip()
        if value and value.lower() not in seen:
            candidate = "|".join(out + [value])
            if len(candidate) > limit:
                break
            out.append(value)
            seen.add(value.lower())
    return "|".join(out) or None


def split_list(value):
    """Inverse of join_list."""
    return [v for v in (value or "").split("|") if v]


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
    # Taste-profile features (filled from TMDB details and LLM output)
    genres = Column(String(256), nullable=True)
    director = Column(String(128), nullable=True)
    keywords = Column(String(512), nullable=True)
    countries = Column(String(128), nullable=True)
    tones = Column(String(256), nullable=True)

    FIELDS = ('tmdb_id', 'title', 'description', 'poster', 'adult',
              'popularity', 'year', 'rating', 'language', 'genres',
              'director', 'keywords', 'countries', 'tones')

    def set_features(self, data, overwrite=False):
        """Fill taste features from a movie dict (lists or strings)."""
        changed = False
        for field in LIST_FIELDS:
            value = join_list(data.get(field), LIST_LIMITS[field])
            if value and (overwrite or not getattr(self, field)):
                setattr(self, field, value)
                changed = True
        director = data.get('director')
        if director and (overwrite or not self.director):
            self.director = str(director)[:128]
            changed = True
        return changed

    def features(self):
        """Feature lists used by the taste engine."""
        return {field: split_list(getattr(self, field))
                for field in LIST_FIELDS} | {
            'director': self.director, 'year': self.year,
            'language': self.language}

    def to_dict(self):
        data = super().to_dict()
        for field in LIST_FIELDS:
            data[field] = split_list(data.get(field))
        return data
