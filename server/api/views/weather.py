#!/usr/bin/env python3
""" Starts the Flask web app """
import os
import requests
from dotenv import load_dotenv  # type: ignore
from flask import jsonify, request  # type: ignore
from api.app import OPENWEATHER_API_KEY
from api.views import app_views


# Get the Weather from OpenWeather API using lat and lon
def get_weather(lat, lon):
    base_url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric'
    }
    # print(OPENWEATHER_API_KEY)
    response = requests.get(base_url, params=params)
    print(response.json)
    if response.status_code == 200:

        return response.json()  # Return the weather data as JSON
    else:
        return None  # Return None if the request failed


# Weather route to get the weather data using get_weather method
@app_views.route('/weather', methods=['GET'])
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
