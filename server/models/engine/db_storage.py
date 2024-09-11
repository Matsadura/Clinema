#!/usr/bin/env python3
"""
Contains the class DBStorage
"""

from models.base_model import BaseModel, Base
from models.movie import Movie
from models.user_movie import User_Movie
from models.user import User
from os import getenv
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker

classes = {"Movie": Movie, "User_Movie": User_Movie, "User": User}


class DBStorage:
    """Interaacts with the MySQL database"""
    __engine = None
    __session = None

    def __init__(self):
        """Instantiate a DBStorage object"""
        MOVIE_DB_USER = getenv('MOVIE_DB_USER')
        MOVIE_DB_PASSWORD = getenv('MOVIE_DB_PASSWORD')
        MOVIE_DB_HOST = getenv('MOVIE_DB_HOST')
        MOVIE_DB_NAME = getenv('MOVIE_DB_NAME')
        self.__engine = create_engine('mysql+mysqldb://{}:{}@{}/{}'.
                                      format(MOVIE_DB_USER,
                                             MOVIE_DB_PASSWORD,
                                             MOVIE_DB_HOST,
                                             MOVIE_DB_NAME))

    def all(self, cls=None):
        """query on the current database session"""
        new_dict = {}
        for clss in classes:
            if cls is None or cls is classes[clss] or cls is clss:
                objs = self.__session.query(classes[clss]).all()
                for obj in objs:
                    key = obj.__class__.__name__ + '.' + obj.id
                    new_dict[key] = obj
        return (new_dict)

    def new(self, obj):
        """Add the object to the current database session"""
        self.__session.add(obj)

    def save(self):
        """Commit all changes of the current database session"""
        self.__session.commit()

    def delete(self, obj=None):
        """Delete from the current database session obj if not None"""
        if obj is not None:
            self.__session.delete(obj)

    def reload(self):
        """Reloads data from the database"""
        Base.metadata.create_all(self.__engine)
        sess_factory = sessionmaker(bind=self.__engine, expire_on_commit=False)
        Session = scoped_session(sess_factory)
        self.__session = Session

    def close(self):
        """Call remove() method on the private session attribute"""
        self.__session.remove()

    def get(self, cls, id):
        """Returns the object based on the class and its ID,
            or None if not found"""
        objs = self.all(cls).values()
        for obj in objs:
            if obj.id == id:
                return obj
        return None

    def count(self, cls=None):
        """
        Returns the number of objects in storage matching the given class.
        If no class is passed, returns the count of all objects in storage.
        """
        return len(self.all(cls).keys())
