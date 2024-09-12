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
CORS(app)
app.url_map.strict_slashes = False
app.register_blueprint(app_views)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
HOST = "0.0.0.0"
PORT = 5000
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')


# Weather route to be moved to api.views.weather
def get_weather(lat, lon):
    base_url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric'
    }

    response = requests.get(base_url, params=params)

    if response.status_code == 200:
        print(response.json)
        return response.json()  # Return the weather data as JSON
    else:
        return None  # Return None if the request failed


# Weather route to be moved to api.views.weather
@app.route('/weather', methods=['GET'])
def weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    print(f'Latitude: {lat}, Longitude: {lon}')

    if not lat or not lon:
        return jsonify({'error': 'Missing latitude or longitude'}), 400

    weather_data = get_weather(lat, lon)

    if weather_data:
        return jsonify(weather_data)
    else:
        return jsonify({'error': 'Failed to fetch weather data'}), 500


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
