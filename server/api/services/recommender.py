"""Recommendation pipeline:
(moods, taste profile, exclusions) -> AI titles -> TMDB movies.

1. Build the user's exclusion set (previously recommended, viewed, liked,
   disliked, saved, plus ids the client says it has already shown).
2. Ask the LLM for candidates, passing the taste summary and exclusions.
3. Screen the reply: drop excluded titles, repeat directors and all but one
   over-exposed "staple"; resolve on TMDB and drop excluded ids.
4. If the model ignored the rules and too few remain, retry once with the
   rejected titles added to the exclusions, then backfill from TMDB
   discover (taste-aware genres, disliked genres removed, varied pages).
"""
import logging
import random
import re

from api.services import ServiceError, credentials, llm, taste, tmdb

log = logging.getLogger(__name__)

MAX_MOODS = 6
MIN_RESULTS = 4
TARGET_RESULTS = llm.MAX_TITLES
LLM_ROUNDS = 2
MAX_OVEREXPOSED = 1
_OVEREXPOSED = {taste.normalize_title(t) for t in llm.OVEREXPOSED}
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


def fallback_genres(moods, profile=None):
    """Pick up to three TMDB genre ids for the fallback query, blending the
    mood vibe with the user's favourite genres."""
    genres = []
    for mood in moods:
        genres.extend(MOOD_GENRES.get(mood.lower(), ()))
    disliked = set(taste.disliked_genre_ids(profile))
    liked = [g for g in taste.liked_genre_ids(profile) if g not in disliked]
    vibe = [g for g in dict.fromkeys(genres) if g not in disliked]
    # Prefer vibe genres the user also likes, then the vibe, then taste
    ordered = [g for g in vibe if g in liked] + vibe + liked
    unique = tuple(dict.fromkeys(ordered))[:3]
    return unique or tuple(g for g in DEFAULT_GENRES if g not in disliked) \
        or DEFAULT_GENRES


class _Picker:
    """Accumulates recommendations while enforcing exclusion and variety."""

    def __init__(self, exclusion, target):
        self.exclusion = exclusion
        self.target = target
        self.movies = []
        self.directors = set()
        self.overexposed = 0
        self.rejected = []  # titles the model returned but we dropped

    @property
    def full(self):
        return len(self.movies) >= self.target

    def screen(self, items):
        """Drop excluded titles, repeat directors and extra staples."""
        kept = []
        for item in items:
            norm = taste.normalize_title(item["title"])
            director = (item.get("director") or "").strip().lower()
            if self.exclusion.blocks(title=item["title"]):
                self.rejected.append(item["title"])
                continue
            if director and director in self.directors:
                continue
            if norm in _OVEREXPOSED:
                if self.overexposed >= MAX_OVEREXPOSED:
                    self.rejected.append(item["title"])
                    continue
                self.overexposed += 1
            if director:
                self.directors.add(director)
            kept.append(item)
        return kept

    def add(self, movies, source):
        for movie in movies:
            if self.full:
                break
            if self.exclusion.blocks(movie["tmdb_id"], movie["title"]):
                self.rejected.append(movie["title"])
                continue
            movie = dict(movie, source=source)
            self.movies.append(movie)
            self.exclusion.add(movie["tmdb_id"], movie["title"],
                               movie.get("year"))


def recommend(moods, config, user_id=None, seen_ids=(), rng=random,
              keys=None):
    """Return {"movies", "titles", "source", "personalized"}.

    ``source`` is "ai" when the LLM produced the list (possibly topped up
    from TMDB) or "fallback" when only TMDB discovery was used.
    Raises ServiceError if no recommendations can be produced at all.
    """
    keys = keys or credentials.server_keys(config)
    tmdb_key = keys["tmdb"]  # candidate list: user's key, then server's
    if not tmdb_key:
        raise ServiceError("Movie database is not configured")

    profile = taste.get_profile(user_id) if user_id else None
    exclusion = taste.build_exclusion(user_id, seen_ids)
    excluded_count = len(exclusion)
    picker = _Picker(exclusion, TARGET_RESULTS)
    taste_text = taste.summarize(profile)
    ai_titles = []

    for _ in range(LLM_ROUNDS):
        need = picker.target - len(picker.movies)
        try:
            items = llm.suggest_titles(
                moods, keys["groq"],
                config.get("GROQ_MODEL"), config.get("LLM_TIMEOUT", 20),
                taste=taste_text,
                exclude=exclusion.for_prompt() + picker.rejected[-20:],
                count=need)
        except llm.LLMError as exc:
            log.info("LLM unavailable, using discovery: %s", exc)
            break
        ai_titles += [i["title"] for i in items]
        picker.add(tmdb.lookup_many(picker.screen(items), tmdb_key), "ai")
        if len(picker.movies) >= picker.target - 1:
            break
        log.info("LLM round returned too few new films (%d/%d); retrying",
                 len(picker.movies), picker.target)

    ai_count = len(picker.movies)
    if not picker.full:
        genres = fallback_genres(moods, profile)
        without = taste.disliked_genre_ids(profile)
        for page in rng.sample(range(1, 6), 3):
            if picker.full:
                break
            extra = tmdb.discover(genres, tmdb_key, page, without) or []
            rng.shuffle(extra := list(extra))
            picker.add(extra, "discover")
            if ai_count >= MIN_RESULTS:
                break  # a small top-up is enough when the AI did its job

    if not picker.movies:
        raise ServiceError("We couldn't find recommendations right now. "
                           "Please try again in a moment.")
    return {"movies": picker.movies,
            "titles": [m["title"] for m in picker.movies],
            "source": "ai" if ai_count else "fallback",
            "personalized": taste.has_signal(profile),
            "excluded": excluded_count}
