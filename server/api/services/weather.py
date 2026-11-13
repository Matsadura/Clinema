"""OpenWeatherMap integration."""
import logging

import requests

from api.services import ServiceError
from api.services.credentials import (KeyRejected, as_list, redact,
                                      report_rejected)
from api.services.http import TTLMemo, get_json

log = logging.getLogger(__name__)
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


def parse_coords(lat, lon):
    """Validate and return (lat, lon) as floats; raise ValueError."""
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        raise ValueError("Latitude and longitude must be numbers")
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("Latitude or longitude out of range")
    return lat, lon


def normalize(raw):
    """Reduce the OpenWeather payload to what the app needs."""
    condition = (raw.get("weather") or [{}])[0]
    main = raw.get("main") or {}
    icon = condition.get("icon") or ""
    return {
        "city": raw.get("name") or "",
        "country": (raw.get("sys") or {}).get("country", ""),
        "temp": round(main.get("temp", 0)),
        "feels_like": round(main.get("feels_like", main.get("temp", 0))),
        "humidity": main.get("humidity"),
        "wind_speed": (raw.get("wind") or {}).get("speed"),
        "condition": condition.get("main", "Unknown"),
        "description": condition.get("description", ""),
        "icon": icon,
        "is_day": not icon.endswith("n"),
    }


@TTLMemo(maxsize=512, ttl=600)
def _fetch(lat, lon, api_key):
    try:
        status, body = get_json(BASE_URL, {"lat": lat, "lon": lon,
                                           "appid": api_key,
                                           "units": "metric"})
    except requests.RequestException as exc:
        log.warning("OpenWeather request failed: %s", redact(exc))
        return None
    if status in (401, 403):
        raise KeyRejected("openweather", api_key)
    if status != 200 or not isinstance(body, dict):
        log.warning("OpenWeather returned HTTP %s", status)
        return None
    return normalize(body)


def get_weather(lat, lon, api_key):
    """Return normalised weather for coordinates (cached ~10 min per ~1 km).

    ``api_key`` is a key or an ordered list of candidate keys (user key
    first, then the server's); rejected or failing keys fall through to the
    next one. Raises ValueError for bad coordinates and ServiceError when
    the upstream API is unavailable or not configured.
    """
    lat, lon = parse_coords(lat, lon)
    keys = as_list(api_key)
    if not keys:
        raise ServiceError("Weather service is not configured")
    for key in keys:
        try:
            weather = _fetch(round(lat, 2), round(lon, 2), key)
        except KeyRejected as exc:
            log.warning("OpenWeather rejected a key; trying the next one")
            report_rejected(exc.provider, exc.key)
            continue
        if weather is not None:
            return weather
    raise ServiceError("Weather service is temporarily unavailable")


def describe(weather):
    """Short human description used in the LLM prompt."""
    if not weather:
        return ""
    part = "daytime" if weather.get("is_day", True) else "night-time"
    desc = weather.get("description") or weather.get("condition", "")
    text = f"{desc}, {weather.get('temp')}°C, {part}"
    return text[:120]
