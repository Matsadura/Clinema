"""The Movie Database (TMDB) integration."""
import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor

import requests

from api.services.credentials import (KeyRejected, as_list, redact,
                                      report_rejected)
from api.services.http import TTLMemo, get_json

log = logging.getLogger(__name__)
# Overridable only so end-to-end tests can point at a local fake
API = os.getenv("TMDB_API_URL", "https://api.themoviedb.org/3").rstrip("/")
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


@TTLMemo(maxsize=1024, ttl=3600)
def _search_many(query, api_key):
    params = {"api_key": api_key, "query": query, "include_adult": "false",
              "page": 1}
    try:
        status, body = _get("/search/movie", params, api_key)
    except requests.RequestException as exc:
        log.warning("TMDB search failed: %s", redact(exc))
        return None
    if status != 200 or not body:
        return None
    results = sorted(body.get("results", []),
                     key=lambda r: r.get("popularity") or 0, reverse=True)
    return [normalize(r) for r in results if r.get("poster_path")][:12]


def search_many(query, api_key):
    """Up to 12 poster-bearing matches for a free-text query."""
    return _with_keys(_search_many, api_key, query) or []


@TTLMemo(maxsize=8, ttl=3600)
def _trending(api_key):
    try:
        status, body = _get("/trending/movie/week", {"api_key": api_key},
                            api_key)
    except requests.RequestException as exc:
        log.warning("TMDB trending failed: %s", redact(exc))
        return None
    if status != 200 or not body:
        return None
    return [normalize(r) for r in body.get("results", [])
            if r.get("poster_path") and r.get("backdrop_path")][:20]


def trending(api_key):
    """This week's trending films (with posters and backdrops)."""
    return _with_keys(_trending, api_key) or []


_VIDEO_TYPES = {"Trailer": 0, "Teaser": 1}
_YOUTUBE_KEY = re.compile(r"^[A-Za-z0-9_-]{6,20}$")


def _youtube_trailers(results):
    videos = [v for v in results
              if v.get("site") == "YouTube" and v.get("type") in _VIDEO_TYPES
              and _YOUTUBE_KEY.match(v.get("key") or "")]
    # Official trailers first, then teasers; newest first within each
    videos.sort(key=lambda v: v.get("published_at") or "", reverse=True)
    videos.sort(key=lambda v: (not v.get("official"), _VIDEO_TYPES[v["type"]]))
    return [{"key": v["key"], "name": (v.get("name") or v["type"])[:120],
             "type": v["type"], "official": bool(v.get("official"))}
            for v in videos[:6]]


@TTLMemo(maxsize=2048, ttl=24 * 3600)
def _trailers(tmdb_id, api_key):
    """YouTube trailers and teasers, English first, then any language."""
    try:
        status, body = _get(f"/movie/{int(tmdb_id)}/videos",
                            {"api_key": api_key,
                             "include_video_language": "en,null"}, api_key)
        if status != 200 or body is None:
            return None
        found = _youtube_trailers(body.get("results") or [])
        if not found:  # e.g. a film only trailed in its original language
            status, body = _get(f"/movie/{int(tmdb_id)}/videos",
                                {"api_key": api_key}, api_key)
            if status == 200 and body:
                found = _youtube_trailers(body.get("results") or [])
    except requests.RequestException as exc:
        log.warning("TMDB videos failed: %s", redact(exc))
        return None
    return found


def trailers(tmdb_id, api_key):
    """See _trailers; ``api_key`` may be a list of candidate keys."""
    return _with_keys(_trailers, api_key, tmdb_id)


# -- movie extras: where to watch, cast, similar films -------------------
_REGION = re.compile(r"^[A-Z]{2}$")
PROVIDER_GROUPS = (("stream", ("flatrate", "free", "ads")),
                   ("rent", ("rent",)), ("buy", ("buy",)))


def valid_region(value):
    value = (value or "").strip().upper()
    return value if _REGION.match(value) else None


def _providers(raw, region):
    """Providers for one country, grouped as stream / rent / buy."""
    found = ((raw.get("watch/providers") or {}).get("results") or {}) \
        .get(region) or {}
    out = {"region": region, "link": None}
    if isinstance(found.get("link"), str) and \
            found["link"].startswith("https://www.themoviedb.org/"):
        out["link"] = found["link"]
    for group, kinds in PROVIDER_GROUPS:
        seen, items = set(), []
        for kind in kinds:
            for p in sorted(found.get(kind) or [],
                            key=lambda p: p.get("display_priority") or 99):
                pid = p.get("provider_id")
                if pid in seen or not p.get("provider_name"):
                    continue
                seen.add(pid)
                items.append({"id": pid, "name": p["provider_name"][:60],
                              "logo": _image(p.get("logo_path"), "w92")})
        out[group] = items[:8]
    return out


def _cast(raw, limit=12):
    cast = sorted((raw.get("credits") or {}).get("cast") or [],
                  key=lambda c: c.get("order", 999))
    return [{"id": c["id"], "name": c["name"][:80],
             "character": (c.get("character") or "")[:80] or None,
             "photo": _image(c.get("profile_path"), "w185")}
            for c in cast[:limit] if c.get("id") and c.get("name")]


@TTLMemo(maxsize=512, ttl=12 * 3600)
def _extras(tmdb_id, region, api_key):
    try:
        status, body = _get(
            f"/movie/{int(tmdb_id)}",
            {"api_key": api_key,
             "append_to_response": "credits,recommendations,similar,"
                                   "watch/providers"}, api_key)
    except requests.RequestException as exc:
        log.warning("TMDB extras failed: %s", redact(exc))
        return None
    if status != 200 or not body:
        return None
    related = [normalize(r) for r in
               (body.get("recommendations") or {}).get("results") or []
               if r.get("poster_path")]
    if len(related) < 6:  # thin recommendations: pad with "similar"
        ids = {m["tmdb_id"] for m in related}
        related += [normalize(r) for r in
                    (body.get("similar") or {}).get("results") or []
                    if r.get("poster_path") and r["id"] not in ids]
    return {"tmdb_id": int(tmdb_id),
            "providers": _providers(body, region),
            "cast": _cast(body),
            "similar": [m for m in related if not m["adult"]][:12]}


def extras(tmdb_id, region, api_key):
    """Where to watch (in ``region``), top cast and similar films."""
    return _with_keys(_extras, api_key, tmdb_id, region)


@TTLMemo(maxsize=256, ttl=12 * 3600)
def _person(person_id, api_key):
    try:
        status, body = _get(f"/person/{int(person_id)}",
                            {"api_key": api_key,
                             "append_to_response": "movie_credits"}, api_key)
    except requests.RequestException as exc:
        log.warning("TMDB person failed: %s", redact(exc))
        return None
    if status != 200 or not body:
        return None
    credits = body.get("movie_credits") or {}
    roles = {}
    for c in credits.get("cast") or []:
        roles.setdefault(c["id"], (c, c.get("character") or None))
    for c in credits.get("crew") or []:
        if c.get("job") == "Director":
            roles[c["id"]] = (roles.get(c["id"], (c,))[0], "Director")
    movies = []
    for raw, role in roles.values():
        if not raw.get("poster_path") or raw.get("adult"):
            continue
        movies.append(dict(normalize(raw), role=(role or "")[:80] or None))
    movies.sort(key=lambda m: m["popularity"], reverse=True)
    return {"id": body["id"], "name": (body.get("name") or "")[:120],
            "photo": _image(body.get("profile_path"), "h632"),
            "known_for": body.get("known_for_department"),
            "birthday": body.get("birthday"),
            "deathday": body.get("deathday"),
            "place_of_birth": (body.get("place_of_birth") or "")[:120] or None,
            "biography": (body.get("biography") or "")[:3000],
            "movies": movies[:40]}


def person(person_id, api_key):
    """A cast or crew member and their best-known films."""
    return _with_keys(_person, api_key, person_id)
