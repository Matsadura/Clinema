#!/usr/bin/python3
""" Contains the flask blueprint """
from flask import Blueprint  # type: ignore

app_views = Blueprint('app_views', __name__, url_prefix="/api")

from api.views.index import *  # nopep8
from api.views.auth import *  # nopep8
from api.views.users import *  # nopep8
from server.api.views.movies_suggestions import *  # nopep8
from api.views.weather import *  # nopep8
