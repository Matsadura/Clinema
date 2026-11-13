"""The Movie Database (TMDB) integration."""
import logging
from concurrent.futures import ThreadPoolExecutor

import requests

from api.services.http import TTLMemo, get_json

log = logging.getLogger(__name__)
API = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/"
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="tmdb")


def _image(path, size):
    return f"{IMAGE_BASE}{size}{path}" if path else None


def _year(date):
    try:
        return int((date or "")[:4])
    except ValueError:
        return None


def normalize(raw):
    """Map a TMDB movie result to Clinema's movie shape."""
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
    }


@TTLMemo(maxsize=2048, ttl=24 * 3600)
def search(title, year, api_key):
    """Return the best TMDB match for ``title`` (and ``year``) or None."""
    params = {"api_key": api_key, "query": title, "include_adult": "false",
              "page": 1}
    if year:
        params["year"] = year
    try:
        status, body = get_json(f"{API}/search/movie", params)
        results = (body or {}).get("results") if status == 200 else None
        if not results and year:
            # Model may have the year slightly wrong; retry without it
            params.pop("year")
            status, body = get_json(f"{API}/search/movie", params)
            results = (body or {}).get("results") if status == 200 else None
    except requests.RequestException as exc:
        log.warning("TMDB search failed for %r: %s", title, exc)
        return None
    if not results:
        return None
    return normalize(results[0])


def lookup_many(items, api_key):
    """Resolve [{"title", "year"}] to movies in parallel, de-duplicated and
    in the original order. Unresolvable titles are dropped."""
    if not api_key or not items:
        return []
    futures = [_pool.submit(search, i["title"], i.get("year"), api_key)
               for i in items]
    movies, seen = [], set()
    for future in futures:
        try:
            movie = future.result(timeout=15)
        except Exception as exc:  # noqa: BLE001 - one bad title is fine
            log.warning("TMDB lookup error: %s", exc)
            continue
        if movie and movie["tmdb_id"] not in seen and movie["poster"]:
            seen.add(movie["tmdb_id"])
            movies.append(movie)
    return movies


@TTLMemo(maxsize=256, ttl=3600)
def discover(genre_ids, api_key):
    """Popular, well-rated movies for a tuple of genre ids (fallback)."""
    if not api_key:
        return None
    params = {"api_key": api_key,
              "with_genres": "|".join(map(str, genre_ids)),
              "sort_by": "popularity.desc", "vote_count.gte": 300,
              "include_adult": "false", "page": 1}
    try:
        status, body = get_json(f"{API}/discover/movie", params)
    except requests.RequestException as exc:
        log.warning("TMDB discover failed: %s", exc)
        return None
    if status != 200 or not body:
        return None
    return [normalize(r) for r in body.get("results", [])
            if r.get("poster_path")]


@TTLMemo(maxsize=2048, ttl=24 * 3600)
def details(tmdb_id, api_key):
    """Fetch a single movie by TMDB id."""
    if not api_key:
        return None
    try:
        status, body = get_json(f"{API}/movie/{int(tmdb_id)}",
                                {"api_key": api_key})
    except requests.RequestException:
        return None
    return normalize(body) if status == 200 and body else None
