#!/usr/bin/env python3
""" Starts the Flask web app """
import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from models import storage
from api.views import app_views


load_dotenv()
app = Flask(__name__)
app.url_map.strict_slashes = False
app.register_blueprint(app_views)
HOST = "0.0.0.0"
PORT = 5000


@app.route('/volumes')
def volume():
    """ A dummy route to test volumes of docker"""
    return "Testing volumes: -Zidane Square headed-"


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
