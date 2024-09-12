#!/usr/bin/env python3
""" Starts the Flask web app """
import os
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from models import storage
from api.views import app_views
from api.views.auth import jwt
from flask_cors import CORS
from datetime import timedelta


load_dotenv()
app = Flask(__name__)
jwt.init_app(app)
CORS(app, supports_credentials=True, resources={r"*": {"origins": "*"}})
app.url_map.strict_slashes = False
app.register_blueprint(app_views)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
HOST = "0.0.0.0"
PORT = 5000
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# To be removed att deployement
@app.route('/volumes')
def volume():
    """ A dummy route to test volumes of docker"""
    return "Testing volumes: -Zidane -"


@app.teardown_appcontext
def teardown_db(exception):
    """ Closes the storage session """
    storage.close()


@app.errorhandler(404)
def page_not_found(e):
    """ Handles the 404 error """
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    if os.getenv("MOVIE_API_HOST"):
        HOST = os.getenv("MOVIE_API_HOST")
    if os.getenv("MOVIE_API_PORT"):
        PORT = os.getenv("MOVIE_API_PORT")
    app.run(host=HOST, port=PORT, threaded=True, debug=True)
