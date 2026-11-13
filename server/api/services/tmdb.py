"""The Movie Database (TMDB) integration."""
import logging
from concurrent.futures import ThreadPoolExecutor

import requests

from api.services.credentials import (KeyRejected, as_list, redact,
                                      report_rejected)
from api.services.http import TTLMemo, get_json

log = logging.getLogger(__name__)
API = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/"
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="tmdb")

GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
}
GENRE_IDS = {name.lower(): gid for gid, name in GENRES.items()}


def _image(path, size):
    return f"{IMAGE_BASE}{size}{path}" if path else None


def _year(date):
    try:
        return int((date or "")[:4])
    except ValueError:
        return None


def _genres(raw):
    if raw.get("genres"):  # details endpoint: [{"id", "name"}]
        return [g["name"] for g in raw["genres"] if g.get("name")]
    return [GENRES[g] for g in raw.get("genre_ids") or [] if g in GENRES]


def _director(raw):
    crew = (raw.get("credits") or {}).get("crew") or []
    for person in crew:
        if person.get("job") == "Director" and person.get("name"):
            return person["name"]
    return None


def normalize(raw):
    """Map a TMDB movie result to Clinema's movie shape."""
    keywords = (raw.get("keywords") or {}).get("keywords") or []
    return {
        "tmdb_id": raw["id"],
        "title": raw.get("title") or raw.get("original_title") or "Untitled",
        "description": (raw.get("overview") or "")[:2000],
        "poster": _image(raw.get("poster_path"), "w500"),
        "backdrop": _image(raw.get("backdrop_path"), "w780"),
        "year": _year(raw.get("release_date")),
        "rating": round(raw.get("vote_average") or 0, 1),
        "popularity": round(raw.get("popularity") or 0, 1),
        "language": raw.get("original_language"),
        "adult": bool(raw.get("adult")),
        "genres": _genres(raw),
        "director": _director(raw),
        "keywords": [k["name"] for k in keywords[:8] if k.get("name")],
        "countries": [c.get("name") for c in
                      raw.get("production_countries") or []
                      if c.get("name")][:3],
    }


def _get(path, params, api_key):
    """GET a TMDB endpoint; raise KeyRejected on 401."""
    status, body = get_json(f"{API}{path}", params)
    if status == 401:
        raise KeyRejected("tmdb", api_key)
    return status, body


def _with_keys(fn, keys, *args):
    """Call ``fn(*args, key)`` with each candidate key until one isn't
    rejected. Returns None if there are no usable keys."""
    for key in as_list(keys):
        try:
            return fn(*args, key)
        except KeyRejected as exc:
            log.warning("TMDB rejected a key; trying the next one")
            report_rejected(exc.provider, exc.key)
    return None


@TTLMemo(maxsize=2048, ttl=24 * 3600)
def _search(title, year, api_key):
    """Return the best TMDB match for ``title`` (and ``year``) or None."""
    params = {"api_key": api_key, "query": title, "include_adult": "false",
              "page": 1}
    if year:
        params["year"] = year
    try:
        status, body = _get("/search/movie", params, api_key)
        results = (body or {}).get("results") if status == 200 else None
        if not results and year:
            # Model may have the year slightly wrong; retry without it
            params.pop("year")
            status, body = _get("/search/movie", params, api_key)
            results = (body or {}).get("results") if status == 200 else None
    except requests.RequestException as exc:
        log.warning("TMDB search failed for %r: %s", title, redact(exc))
        return None
    if not results:
        return None
    return normalize(results[0])


def search(title, year, api_key):
    """Best TMDB match for ``title``; ``api_key`` may be a candidate list."""
    return _with_keys(_search, api_key, title, year)


AI_FIELDS = {"personalized_reason": "why", "mood_fit": "fit",
             "tone": "tone", "country": "country"}


def _lookup_all(items, api_key):
    futures = [_pool.submit(_search, i["title"], i.get("year"), api_key)
               for i in items]
    found = []
    for future in futures:
        try:
            found.append(future.result(timeout=15))
        except KeyRejected:
            for other in futures:
                other.cancel()
            raise
        except Exception as exc:  # noqa: BLE001 - one bad title is fine
            log.warning("TMDB lookup error: %s", redact(exc))
            found.append(None)
    return found


def lookup_many(items, api_key):
    """Resolve LLM items ({"title", "year", ...}) to movies in parallel,
    de-duplicated and in the original order. Unresolvable titles and films
    without a poster are dropped. The LLM's explanation fields are copied
    onto each movie (``why``, ``fit``, ``tone``...). ``api_key`` may be a
    list of candidate keys; a rejected key falls back to the next one."""
    if not items:
        return []
    results = _with_keys(_lookup_all, api_key, items) or []
    movies, seen = [], set()
    for item, found in zip(items, results):
        if not found or found["tmdb_id"] in seen or not found["poster"]:
            continue
        movie = dict(found)  # never mutate the cached search result
        for source, target in AI_FIELDS.items():
            if item.get(source):
                movie[target] = item[source]
        if not movie.get("genres") and item.get("genres"):
            movie["genres"] = item["genres"]
        if not movie.get("director") and item.get("director"):
            movie["director"] = item["director"]
        if item.get("country") and not movie.get("countries"):
            movie["countries"] = [item["country"]]
        seen.add(movie["tmdb_id"])
        movies.append(movie)
    return movies


def _discover_page(genres, joiner, api_key, page=1, without=()):
    params = {"api_key": api_key,
              "with_genres": joiner.join(map(str, genres)),
              "sort_by": "popularity.desc", "vote_count.gte": 300,
              "vote_average.gte": 6.5, "include_adult": "false",
              "page": page}
    if without:
        params["without_genres"] = ",".join(map(str, without))
    status, body = _get("/discover/movie", params, api_key)
    if status != 200 or not body:
        return []
    return [normalize(r) for r in body.get("results", [])
            if r.get("poster_path")]


@TTLMemo(maxsize=512, ttl=3600)
def _discover(genre_ids, page, without, api_key):
    """Well-rated movies for a tuple of genre ids (fallback).

    Prefers films matching the two strongest genres together, widening to
    any of the genres when that is too restrictive. ``page`` varies the
    result set between calls; ``without`` excludes genres the user dislikes.
    """
    if not genre_ids:
        return None
    try:
        results = _discover_page(genre_ids[:2], ",", api_key, page, without)
        if len(results) < 8:
            seen = {m["tmdb_id"] for m in results}
            results += [m for m in _discover_page(genre_ids, "|", api_key,
                                                  page, without)
                        if m["tmdb_id"] not in seen]
    except requests.RequestException as exc:
        log.warning("TMDB discover failed: %s", redact(exc))
        return None
    return results or None


def discover(genre_ids, api_key, page=1, without=()):
    """See _discover; ``api_key`` may be a list of candidate keys."""
    return _with_keys(_discover, api_key, tuple(genre_ids), page,
                      tuple(without))


@TTLMemo(maxsize=2048, ttl=24 * 3600)
def _details(tmdb_id, api_key):
    """Fetch a single movie by TMDB id, including director and keywords."""
    try:
        status, body = _get(f"/movie/{int(tmdb_id)}",
                            {"api_key": api_key,
                             "append_to_response": "credits,keywords"},
                            api_key)
    except requests.RequestException:
        return None
    return normalize(body) if status == 200 and body else None


def details(tmdb_id, api_key):
    """See _details; ``api_key`` may be a list of candidate keys."""
    return _with_keys(_details, api_key, tmdb_id)
