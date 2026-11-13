"""Preference learning ("Movie Learning").

Interaction events (view, like, dislike, save, ...) are logged with weights.
They are aggregated into a per-user taste profile (positive affinities and
negative constraints over genres, directors, themes, eras, languages and
tone) that is persisted and rendered as a compact summary for the LLM
prompt. This module also builds the per-user exclusion set used to stop
recommendations from repeating.
"""
import json
import logging
import re
import unicodedata
from collections import defaultdict
from datetime import timedelta

from api.services import tmdb
from models import storage
from models.base_model import utcnow
from models.interaction import EVENT_WEIGHTS, Interaction, TasteProfile
from models.movie import Movie
from models.user_movie import User_Movie

log = logging.getLogger(__name__)

HALF_LIFE_DAYS = 60          # older signals count half as much every 60 days
VIEW_CAP = 1.5               # repeated views of one movie add at most this
MAX_EVENTS = 1000            # events considered per profile rebuild
RECOMMENDED_WINDOW_DAYS = 30  # shown-but-ignored movies may resurface later
PROMPT_EXCLUSIONS = 60       # most recent titles listed in the prompt
TOP = {"genres": 5, "directors": 3, "keywords": 6, "eras": 3,
       "languages": 3, "countries": 3, "tones": 4}
FEATURE_WEIGHTS = {"genres": 1.0, "directors": 1.0, "keywords": 0.5,
                   "eras": 0.5, "languages": 0.6, "countries": 0.4,
                   "tones": 0.75}
LIKE_THRESHOLD = 0.4
DISLIKE_THRESHOLD = -0.9

LANGUAGES = {
    "en": "English", "fr": "French", "es": "Spanish", "de": "German",
    "it": "Italian", "ja": "Japanese", "ko": "Korean", "zh": "Chinese",
    "cn": "Cantonese", "hi": "Hindi", "pt": "Portuguese", "ru": "Russian",
    "sv": "Swedish", "da": "Danish", "fa": "Persian", "tr": "Turkish",
    "ar": "Arabic", "pl": "Polish", "nl": "Dutch", "no": "Norwegian",
}


# -- event logging -----------------------------------------------------------
def record_event(user_id, movie_id, event, context=None, weight=None):
    """Add an interaction event to the session (caller commits)."""
    if event not in EVENT_WEIGHTS:
        raise ValueError(f"Unknown event {event!r}")
    storage.new(Interaction(
        user_id=user_id, movie_id=int(movie_id), event=event,
        weight=EVENT_WEIGHTS[event] if weight is None else weight,
        context=json.dumps(context)[:512] if context else None))


def record_recommendations(user_id, movies, context=None):
    """Remember which movies were shown so they aren't repeated."""
    for movie in movies:
        record_event(user_id, movie["tmdb_id"], "recommended", context)


def ensure_features(tmdb_ids, api_key):
    """Make sure the given movies exist locally with taste features
    (genres, director, keywords...). Fetches TMDB details when missing."""
    if not tmdb_ids:
        return
    rows = {m.tmdb_id: m for m in storage.session.query(Movie).filter(
        Movie.tmdb_id.in_(list(tmdb_ids)))}
    for tmdb_id in tmdb_ids:
        movie = rows.get(tmdb_id)
        if movie is not None and movie.genres and movie.director:
            continue
        data = tmdb.details(tmdb_id, api_key) if api_key else None
        if not data:
            continue
        if movie is None:
            fields = {k: data.get(k) for k in
                      ('tmdb_id', 'title', 'description', 'poster', 'adult',
                       'popularity', 'year', 'rating', 'language')}
            fields['title'] = (fields['title'] or '')[:128]
            movie = Movie(**fields)
            storage.new(movie)
            rows[tmdb_id] = movie
        movie.set_features(data)


# -- aggregation -------------------------------------------------------------
def _decay(age):
    days = max(age.total_seconds(), 0) / 86400
    return 0.5 ** (days / HALF_LIFE_DAYS)


def movie_weights(user_id, now=None):
    """Net, time-decayed weight per movie from the user's events.

    Toggle events cancel exactly (like + unlike = 0); views are capped so
    browsing alone can't outweigh an explicit like or dislike.
    """
    now = now or utcnow()
    events = storage.session.query(Interaction).filter(
        Interaction.user_id == user_id,
        Interaction.event != 'recommended',
    ).order_by(Interaction.created_at.desc()).limit(MAX_EVENTS).all()

    explicit, views, last = defaultdict(float), defaultdict(float), {}
    for event in events:
        if event.event == 'view':
            views[event.movie_id] += event.weight
        else:
            explicit[event.movie_id] += event.weight
        last.setdefault(event.movie_id, event.created_at)

    weights = {}
    for movie_id, seen_at in last.items():
        raw = explicit[movie_id] + min(views[movie_id], VIEW_CAP)
        if abs(raw) > 1e-9:
            weights[movie_id] = raw * _decay(now - seen_at)
    return weights, len(events)


def _features(movie):
    data = movie.features()
    feats = {
        "genres": data["genres"],
        "directors": [data["director"]] if data["director"] else [],
        "keywords": data["keywords"],
        "countries": data["countries"],
        "tones": data["tones"],
        "eras": [f"{data['year'] // 10 * 10}s"] if data["year"] else [],
        "languages": [LANGUAGES.get(data["language"], data["language"])]
        if data["language"] and data["language"] != "en" else [],
    }
    return feats


def build_profile(user_id, now=None):
    """Aggregate the user's interactions into a taste profile dict."""
    weights, n_events = movie_weights(user_id, now)
    movies = {m.tmdb_id: m for m in storage.session.query(Movie).filter(
        Movie.tmdb_id.in_(list(weights)))} if weights else {}

    scores = {kind: defaultdict(float) for kind in FEATURE_WEIGHTS}
    for movie_id, weight in weights.items():
        movie = movies.get(movie_id)
        if movie is None:
            continue
        for kind, values in _features(movie).items():
            for value in values:
                scores[kind][value] += weight * FEATURE_WEIGHTS[kind]

    likes, dislikes = {}, {}
    for kind, table in scores.items():
        ranked = sorted(table.items(), key=lambda kv: kv[1], reverse=True)
        top = [[k, round(v, 2)] for k, v in ranked if v >= LIKE_THRESHOLD]
        if top:
            likes[kind] = top[:TOP[kind]]
        bottom = [[k, round(v, 2)] for k, v in reversed(ranked)
                  if v <= DISLIKE_THRESHOLD]
        if bottom and kind in ("genres", "keywords", "tones", "directors"):
            dislikes[kind] = bottom[:3]

    return {
        "interactions": n_events,
        "signal": round(sum(abs(w) for w in weights.values()), 2),
        "likes": likes,
        "dislikes": dislikes,
        "recent_likes": _recent_titles(user_id, User_Movie.like),
        "recent_dislikes": _recent_titles(user_id, User_Movie.dislike),
    }


def _recent_titles(user_id, flag, limit=5):
    rows = storage.session.query(User_Movie.movie_id).filter(
        User_Movie.user_id == user_id, flag.is_(True)).order_by(
        User_Movie.updated_at.desc()).limit(limit).all()
    ids = [r.movie_id for r in rows]
    if not ids:
        return []
    movies = {m.tmdb_id: m for m in storage.session.query(Movie).filter(
        Movie.tmdb_id.in_(ids))}
    return [_label(movies[i]) for i in ids if i in movies]


def _label(movie):
    return f"{movie.title} ({movie.year})" if movie.year else movie.title


def refresh_profile(user_id, now=None):
    """Rebuild and persist the user's taste profile; returns the dict."""
    profile = build_profile(user_id, now)
    row = storage.session.get(TasteProfile, user_id)
    if row is None:
        row = TasteProfile(user_id=user_id)
        storage.new(row)
    row.profile = json.dumps(profile)
    row.interaction_count = profile["interactions"]
    row.updated_at = utcnow()
    return profile


def get_profile(user_id):
    """Persisted profile (built on first access)."""
    row = storage.session.get(TasteProfile, user_id)
    if row is not None:
        return row.data()
    profile = refresh_profile(user_id)
    storage.save()
    return profile


def has_signal(profile):
    return bool(profile and (profile.get("likes") or profile.get("dislikes")
                             or profile.get("recent_likes")
                             or profile.get("recent_dislikes")))


def _names(entries, n=None):
    return ", ".join(name for name, _ in entries[:n])


def summarize(profile):
    """Compact, token-efficient text describing the viewer's taste.

    Returns a cold-start note when there is no usable history.
    """
    if not has_signal(profile):
        return ("No viewing history yet (cold start): give a balanced, varied "
                "set across genres, eras and countries so the viewer's taste "
                "can be learned from their reactions.")
    labels = {"genres": "genres", "directors": "directors",
              "keywords": "themes", "eras": "eras", "languages": "languages",
              "countries": "countries", "tones": "tone"}
    lines = [f"Learned from {profile.get('interactions', 0)} interactions. "
             "Use it to choose WHICH films fit the vibe, not to override "
             "the vibe."]
    likes = profile.get("likes") or {}
    loves = [f"{labels[k]}: {_names(v)}" for k, v in likes.items() if v]
    if loves:
        lines.append("Leans towards — " + "; ".join(loves) + ".")
    dislikes = profile.get("dislikes") or {}
    avoid = [f"{labels[k]}: {_names(v)}" for k, v in dislikes.items() if v]
    if avoid:
        lines.append("Steer away from — " + "; ".join(avoid) + ".")
    if profile.get("recent_likes"):
        lines.append("Recently liked: " +
                     "; ".join(profile["recent_likes"]) + ".")
    if profile.get("recent_dislikes"):
        lines.append("Recently disliked: " +
                     "; ".join(profile["recent_dislikes"]) + ".")
    return "\n".join(lines)


def disliked_genre_ids(profile):
    return tuple(tmdb.GENRE_IDS[name.lower()] for name, _ in
                 (profile or {}).get("dislikes", {}).get("genres", [])
                 if name.lower() in tmdb.GENRE_IDS)


def liked_genre_ids(profile):
    return tuple(tmdb.GENRE_IDS[name.lower()] for name, _ in
                 (profile or {}).get("likes", {}).get("genres", [])
                 if name.lower() in tmdb.GENRE_IDS)


# -- exclusions ----------------------------------------------------------
_ARTICLES = re.compile(r"^(the|a|an|le|la|les|el|los|las|il|der|die|das)\s+")


def normalize_title(title):
    """Lower-case, accent-free, article-free, punctuation-free title."""
    text = unicodedata.normalize("NFKD", title or "")
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    text = re.sub(r"[^a-z0-9 ]+", " ", text.replace("&", " and "))
    text = " ".join(text.split())
    return _ARTICLES.sub("", text)


class Exclusion:
    """Movies that must not be recommended again."""

    def __init__(self):
        self.ids = set()
        self.titles = set()
        self.prompt_titles = []  # most recent first, for the LLM prompt

    def add(self, tmdb_id=None, title=None, year=None):
        if tmdb_id is not None:
            self.ids.add(int(tmdb_id))
        if title:
            norm = normalize_title(title)
            if norm and norm not in self.titles:
                self.titles.add(norm)
                self.prompt_titles.append(f"{title} ({year})" if year
                                          else title)

    def blocks(self, tmdb_id=None, title=None):
        return (tmdb_id is not None and int(tmdb_id) in self.ids) or \
            (bool(title) and normalize_title(title) in self.titles)

    def for_prompt(self, limit=PROMPT_EXCLUSIONS):
        return self.prompt_titles[:limit]

    def __len__(self):
        return len(self.ids)


def build_exclusion(user_id=None, seen_ids=(), now=None):
    """Everything previously recommended, viewed, liked, disliked or saved
    by the user, plus ``seen_ids`` sent by the client (anonymous sessions).
    """
    now = now or utcnow()
    ordered = []  # tmdb ids, most recent first
    if user_id:
        cutoff = now - timedelta(days=RECOMMENDED_WINDOW_DAYS)
        events = storage.session.query(
            Interaction.movie_id, Interaction.event,
            Interaction.created_at).filter(
            Interaction.user_id == user_id).order_by(
            Interaction.created_at.desc()).limit(2000).all()
        for movie_id, event, created_at in events:
            if event == 'recommended' and created_at < cutoff:
                continue
            ordered.append(movie_id)
        ordered += [row.movie_id for row in storage.session.query(
            User_Movie.movie_id).filter(User_Movie.user_id == user_id)]
    ordered += [int(i) for i in seen_ids]

    unique = list(dict.fromkeys(ordered))
    titles = {m.tmdb_id: m for m in storage.session.query(Movie).filter(
        Movie.tmdb_id.in_(unique))} if unique else {}
    exclusion = Exclusion()
    for movie_id in unique:
        movie = titles.get(movie_id)
        exclusion.add(movie_id, movie.title if movie else None,
                      movie.year if movie else None)
    return exclusion
