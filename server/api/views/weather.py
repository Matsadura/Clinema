#!/usr/bin/env python3
""" Weather related routes """
import requests
from flask import jsonify, request
from api.app import OPENWEATHER_API_KEY
from api.views import app_views


def get_weather(lat, lon):
    """
    Get the Weather from OpenWeather API using latitude and longitude.

    Parameters:
    - lat (float): Latitude coordinate.
    - lon (float): Longitude coordinate.

    Returns:
    - dict: Weather data in JSON format from OpenWeather API.
    """
    base_url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric'
    }

    response = requests.get(base_url, params=params)
    print(response.json)
    if response.status_code == 200:
        return response.json()
    return None


@app_views.route('/weather', methods=['GET'])
def weather():
    """
    Weather route to get the weather data using the get_weather method.

    Returns:
    - JSON: Weather data in JSON format.
    """
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    print(f'Latitude: {lat}, Longitude: {lon}')

    if not lat or not lon:
        return jsonify({'error': 'Missing latitude or longitude'}), 400

    weather_data = get_weather(lat, lon)

    if weather_data:
        return jsonify(weather_data)
    return jsonify({'error': 'Failed to fetch weather data'}), 500
