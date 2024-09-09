#!/usr/bin/env python3
""" Starts the Flask web app """
import os
from flask import Flask
from dotenv import load_dotenv


load_dotenv()
app = Flask(__name__)
app.url_map.strict_slashes = False
HOST = "0.0.0.0"
PORT = 5000


@app.route('/volumes')
def volume():
    """ A dummy route to test volumes of docker"""
    return "Testing volumes: -Zidane Square headed-"


if __name__ == "__main__":
    if os.getenv("MOVIE_API_HOST"):
        HOST = os.getenv("MOVIE_API_HOST")
    if os.getenv("MOVIE_API_PORT"):
        PORT = os.getenv("MOVIE_API_PORT")
    app.run(host=HOST, port=PORT, threaded=True, debug=True)
