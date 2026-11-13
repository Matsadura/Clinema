"""Recommendation pipeline: (moods, weather) -> AI titles -> TMDB movies.

If the LLM is unavailable or returns too few resolvable titles, the pipeline
degrades gracefully to TMDB's discover endpoint using a mood/weather -> genre
mapping, so users still get results.
"""
import logging
import re

from api.services import ServiceError, llm, tmdb
from api.services.weather import describe

log = logging.getLogger(__name__)

MAX_MOODS = 6
MIN_RESULTS = 4
_MOOD_RE = re.compile(r"^[A-Za-z][A-Za-z \-']{0,31}$")

# TMDB genre ids: 28 Action, 12 Adventure, 16 Animation, 35 Comedy,
# 80 Crime, 99 Documentary, 18 Drama, 10751 Family, 14 Fantasy, 36 History,
# 27 Horror, 10402 Music, 9648 Mystery, 10749 Romance, 878 Sci-Fi,
# 53 Thriller, 10752 War, 37 Western
MOOD_GENRES = {
    "joyful": (35, 10751), "euphoric": (12, 10402), "serene": (18, 99),
    "grateful": (18, 10751), "optimistic": (35, 12), "hopeful": (18, 14),
    "excited": (28, 12), "enthusiastic": (12, 35), "astonished": (878, 14),
    "intrigued": (9648, 53), "curious": (99, 878), "confident": (28, 80),
    "proud": (36, 18), "sad": (18, 10749), "depressed": (35, 16),
    "stressed": (35, 16), "angry": (28, 80), "surprised": (9648, 53),
    "tired": (16, 10751), "relaxed": (35, 10749), "bored": (28, 12),
    "lonely": (10749, 18), "calm": (99, 18), "reflective": (18, 36),
}
WEATHER_GENRES = {
    "clear": (12, 35), "clouds": (18, 9648), "rain": (10749, 18),
    "drizzle": (10749, 18), "thunderstorm": (53, 27), "snow": (10751, 14),
    "mist": (9648, 53), "fog": (9648, 53), "haze": (9648, 18),
}
DEFAULT_GENRES = (18, 35, 12)


def parse_moods(value):
    """Normalise the ``mood`` request field into a validated list.

    Accepts a string (comma-separated) or a list of strings.
    Raises ValueError on invalid input.
    """
    if value is None or value == "" or value == []:
        return []
    if isinstance(value, str):
        value = value.split(",")
    if not isinstance(value, list):
        raise ValueError("Mood must be a string or a list of strings")
    moods = []
    for item in value:
        if not isinstance(item, str):
            raise ValueError("Mood must be a string or a list of strings")
        item = " ".join(item.split())
        if not item:
            continue
        if not _MOOD_RE.match(item):
            raise ValueError(f"Invalid mood: {item[:32]!r}")
        if item.capitalize() not in moods:
            moods.append(item.capitalize())
    if len(moods) > MAX_MOODS:
        raise ValueError(f"Select at most {MAX_MOODS} moods")
    return moods


def fallback_genres(moods, weather):
    """Pick up to three TMDB genre ids for the fallback query."""
    genres = []
    for mood in moods:
        genres.extend(MOOD_GENRES.get(mood.lower(), ()))
    if weather:
        genres.extend(WEATHER_GENRES.get(
            (weather.get("condition") or "").lower(), ()))
    unique = tuple(dict.fromkeys(genres))[:3]
    return unique or DEFAULT_GENRES


def recommend(moods, weather, config):
    """Return {"movies": [...], "titles": [...], "source": "ai"|"fallback"}.

    Raises ServiceError if no recommendations can be produced at all.
    """
    tmdb_key = config.get("TMDB_API_KEY")
    if not tmdb_key:
        raise ServiceError("Movie database is not configured")

    titles, movies, source = [], [], "ai"
    try:
        titles = llm.suggest_titles(
            moods, describe(weather), config.get("GROQ_API_KEY"),
            config.get("GROQ_MODEL"), config.get("LLM_TIMEOUT", 20))
        movies = tmdb.lookup_many(titles, tmdb_key)
    except llm.LLMError as exc:
        log.info("Falling back to genre discovery: %s", exc)

    if len(movies) < MIN_RESULTS:
        extra = tmdb.discover(fallback_genres(moods, weather), tmdb_key) or []
        seen = {m["tmdb_id"] for m in movies}
        for movie in extra:
            if len(movies) >= llm.MAX_TITLES:
                break
            if movie["tmdb_id"] not in seen:
                movies.append(movie)
                seen.add(movie["tmdb_id"])
        if not titles:
            source = "fallback"

    if not movies:
        raise ServiceError("We couldn't find recommendations right now. "
                           "Please try again in a moment.")
    return {"movies": movies,
            "titles": [t["title"] for t in titles] or
            [m["title"] for m in movies],
            "source": source}
