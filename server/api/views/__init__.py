#!/usr/bin/python3
""" Contains the flask blueprint """
from flask import Blueprint

app_views = Blueprint('app_views', __name__, url_prefix="/api")

from api.views.index import *  # noqa: E402,F401,F403
from api.views.auth import *  # noqa: E402,F401,F403
from api.views.movies import *  # noqa: E402,F401,F403
from api.views.movies_suggestions import *  # noqa: E402,F401,F403
from api.views.users import *  # noqa: E402,F401,F403
from api.views.user_movies import *  # noqa: E402,F401,F403
from api.views.api_keys import *  # noqa: E402,F401,F403
