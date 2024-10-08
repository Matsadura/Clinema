#!/usr/bin/python3
""" This script gets the mood keyword and weather
information from the front """
from api.views import app_views
from flask import jsonify, request  # type: ignore
from api.views.weather import get_weather
from groq import Groq  # type: ignore
from api.app import GROQ_API_KEY


def suggest_movie(mood=None, weather=None):
    """
    - Suggests a movie based on the provided mood and/or weather.
    - Parameters:
        - mood (str): The mood keyword for suggesting a movie.
        - weather (str): The weather information for suggesting a movie.
    - Returns:
        - A list of suggested movies based on the mood and/or weather.
    """

    client = Groq(api_key=GROQ_API_KEY)

    # Prepare the content for the request based on available information
    if mood and weather:
        content = f"Suggest a list of movies that complement the mood '{mood}\
            'based on the current weather conditions: {weather}. Provide the \
                content in array format [\"movie1\", \"movie2\", ... , \"movie\
                    n\"]. Don't write anything but the array."
    elif mood:
        content = f"Suggest a list of movies that complement the mood '{mood}\
            '. Provide the content in array format [\"movie1\", \"movie2\",\
                  ... , \"movien\"]. Don't write anything but the array."
    elif weather:
        content = f"Suggest a list of movies based on the current weather \
            conditions: {weather}. Provide the content in array format \
                [\"movie1\", \"movie2\", ... , \"movien\"]. Don't write \
                anything but the array."
    else:
        content = "Suggest a list of movies. Provide the content in array \
            format [\"movie1\", \"movie2\", ... , \"movien\"].\
                  Don't write anything but the array."

    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {
                "role": "user",
                "content": content
            }
        ],
        temperature=1,
        max_tokens=2024,
        top_p=1,
        stream=False,
        stop=None,
    )

    response_content = completion.choices[0].message.content
    try:
        suggestions = eval(response_content)
        if isinstance(suggestions, list):
            return suggestions
        else:
            return []
    except Exception as e:
        return []


@app_views.route('/movies_by_mood_and_weather', methods=['POST'])
def movie_suggestion_mood_weather():
    """Get movie suggestions based on mood and weather"""
    data = request.get_json()
    mood = data.get('mood')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if not mood or not latitude or not longitude:
        return jsonify({"error": "Mood, latitude, and \
                        longitude are required"}), 400

    weather = get_weather(latitude, longitude)

    suggestions = suggest_movie(mood, weather)

    return jsonify({"suggestions": suggestions}), 201


@app_views.route('/movies_by_mood', methods=['POST'])
def movie_suggestion_mood_only():
    """Get movie suggestions based on mood only"""
    data = request.get_json()
    mood = data.get('mood')

    if not mood:
        return jsonify({"error": "Mood is required"}), 400

    # Suggest movies based on mood only
    suggestions = suggest_movie(mood=mood)
    return jsonify({"suggestions": suggestions}), 201


@app_views.route('/movies_by_weather', methods=['POST'])
def movie_suggestion_weather_only():
    """Get movie suggestions based on weather only"""
    data = request.get_json()
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if not latitude or not longitude:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    weather = get_weather(latitude, longitude)

    suggestions = suggest_movie(weather=weather)

    return jsonify({"suggestions": suggestions})
