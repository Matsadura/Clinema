#!/usr/bin/env python3
""" Weather related routes """
from flask import jsonify, request

from api.extensions import limiter
from api.services.weather import get_weather
from api.views import app_views
from api.views.helpers import error, request_keys


@app_views.route('/weather', methods=['GET'])
@limiter.limit("60 per minute")
def weather():
    """Current weather for ?lat=&lon= (normalised, cached)."""
    lat, lon = request.args.get('lat'), request.args.get('lon')
    if not lat or not lon:
        return error('Missing latitude or longitude')
    try:
        data = get_weather(lat, lon, request_keys()["openweather"])
    except ValueError as exc:
        return error(str(exc))
    return jsonify(data)
