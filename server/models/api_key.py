#!/usr/bin/env python3
"""Holds class UserApiKey: a user's own third-party API key, encrypted."""
from sqlalchemy import (Column, DateTime, ForeignKey, String, Text,
                        UniqueConstraint)

from models.base_model import Base, BaseModel


class UserApiKey(BaseModel, Base):
    """One provider key per user. ``secret`` holds Fernet ciphertext; the
    plain key is never stored or returned by the API."""
    __tablename__ = 'user_api_keys'
    user_id = Column(String(128),
                     ForeignKey('users.id', ondelete='CASCADE'),
                     nullable=False)
    provider = Column(String(20), nullable=False)  # groq|tmdb
    secret = Column(Text, nullable=False)
    last4 = Column(String(8), nullable=False)
    # 'valid' when the provider accepted it; 'invalid' after a rejection
    status = Column(String(16), nullable=False, default='valid')
    validated_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'provider',
                         name='uq_user_api_keys_user_provider'),
    )

    def to_dict(self):
        data = super().to_dict()
        data.pop('secret', None)
        return data
