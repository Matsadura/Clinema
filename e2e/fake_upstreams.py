#!/usr/bin/env python3
"""Deterministic stand-ins for TMDB and Groq, for end-to-end tests.

The API container is pointed here with TMDB_API_URL and GROQ_BASE_URL
(docker-compose.e2e.yml), so the real stack runs without network access
or API keys. Standard library only.
"""
import json
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

TITLES = [
    "Night Harbour", "The Quiet Orchard", "Paper Lanterns", "Salt and Iron",
    "Glass Mountain", "A Winter Map", "The Long Drive Home", "Borrowed Light",
    "Echoes of Tide", "Small Hours", "The Last Projectionist", "Red Meridian",
    "Afterglow Avenue", "The Cartographer", "Northern Lines", "Velvet Static",
    "Hollow Crown Road", "The Kite Maker", "Silent Frequencies",
    "Copper Sky", "Island of Clocks", "Low Tide Blues", "Garden of Rain",
    "The Night Ferry", "Second Spring", "Distant Thunder", "Moth and Lamp",
    "The Orchard Keeper", "Lantern Fish", "Harbour Lights",
]
GENRES = [[18, 10749], [35, 18], [9648, 53], [28, 12], [878, 14], [16, 10751]]
GENRE_NAMES = {18: "Drama", 10749: "Romance", 35: "Comedy", 9648: "Mystery",
               53: "Thriller", 28: "Action", 12: "Adventure",
               878: "Science Fiction", 14: "Fantasy", 16: "Animation",
               10751: "Family"}
FILMS = [{
    "id": 5000 + i, "title": t, "original_title": t,
    "overview": f"{t}: a quietly moving story about choices and chances.",
    "poster_path": f"/e2e-poster-{i}.jpg", "backdrop_path": f"/e2e-b-{i}.jpg",
    "release_date": f"{1960 + i * 2}-05-01", "vote_average": 6.5 + (i % 30) / 10,
    "popularity": 100 - i, "original_language": "en", "adult": False,
    "genre_ids": GENRES[i % len(GENRES)],
} for i, t in enumerate(TITLES)]
BY_ID = {f["id"]: f for f in FILMS}
SHOW_NAMES = ["Quiet Harbour", "The Lighthouse Years", "Northern Shift",
              "Paper Cities", "Slow Rivers", "The Night Desk"]
SHOWS = [{
    "id": 8000 + i, "name": n, "original_name": n,
    "overview": f"{n}: a slow-burning series about small lives.",
    "poster_path": f"/e2e-show-{i}.jpg", "backdrop_path": f"/e2e-sb-{i}.jpg",
    "first_air_date": f"{2005 + i}-09-01", "vote_average": 7.5,
    "popularity": 60 - i, "original_language": "en",
    "genre_ids": [18, 9648],
} for i, n in enumerate(SHOW_NAMES)]
SHOWS_BY_ID = {s["id"]: s for s in SHOWS}
PEOPLE = {7001: "Ada Marlowe", 7002: "Jonas Reyes", 7003: "Mira Okafor"}
_llm_calls = 0
_lock = threading.Lock()


def details(film, pool=FILMS):
    data = dict(film, genres=[{"id": g, "name": GENRE_NAMES[g]}
                              for g in film["genre_ids"]])
    others = [f for f in pool if f["id"] != film["id"]]
    data.update({
        "credits": {
            "cast": [{"id": pid, "name": name, "character": f"Role {n}",
                      "order": n, "profile_path": None}
                     for n, (pid, name) in enumerate(PEOPLE.items())],
            "crew": [{"id": 7100, "name": "Lena Varga", "job": "Director"}]},
        "keywords": {"keywords": [{"id": 1, "name": "friendship"}]},
        "recommendations": {"results": others[:8]},
        "similar": {"results": others[8:12]},
        "watch/providers": {"results": {"US": {
            "link": f"https://www.themoviedb.org/movie/{film['id']}/watch",
            "flatrate": [{"provider_id": 8, "provider_name": "Netflix",
                          "logo_path": None, "display_priority": 1}],
            "rent": [{"provider_id": 2, "provider_name": "Apple TV",
                      "logo_path": None, "display_priority": 2}]}}},
    })
    return data


def chat_completion(body):
    """Return 20 films the prompt doesn't exclude, rotating on each call."""
    global _llm_calls
    prompt = body["messages"][-1]["content"]
    excluded = prompt.split("Excluded", 1)[1] if "Excluded" in prompt else ""
    with _lock:
        start = (_llm_calls * 7) % len(FILMS)
        _llm_calls += 1
    pool = SHOWS if "TV series" in prompt else FILMS
    start %= len(pool)
    order = pool[start:] + pool[:start]
    name = "name" if pool is SHOWS else "title"
    date = "first_air_date" if pool is SHOWS else "release_date"
    picks = [f for f in order if f[name] not in excluded][:20]
    movies = [{"title": f[name], "year": int(f[date][:4]),
               "genres": [GENRE_NAMES[g] for g in f["genre_ids"]],
               "director": f"Director {f['id']}", "country": "France",
               "tone": "bittersweet", "mood_fit": "Gentle and absorbing.",
               "personalized_reason": "A distinctive discovery."}
              for f in picks]
    return {"id": "e2e", "object": "chat.completion", "created": int(time.time()),
            "model": body.get("model", "fake"),
            "choices": [{"index": 0, "finish_reason": "stop", "message": {
                "role": "assistant", "content": json.dumps({"movies": movies})}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1,
                      "total_tokens": 2}}


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):  # quiet
        pass

    def do_GET(self):
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        path = url.path
        if path == "/healthz":
            return self._send(200, {"ok": True})
        needle = q.get("query", "").lower()
        if path == "/3/search/movie":
            hits = [f for f in FILMS if needle in f["title"].lower()]
            return self._send(200, {"results": hits})
        if path == "/3/search/tv":
            hits = [s for s in SHOWS if needle in s["name"].lower()]
            return self._send(200, {"results": hits})
        if path == "/3/search/multi":
            hits = [dict(f, media_type="movie") for f in FILMS
                    if needle in f["title"].lower()]
            hits += [dict(s, media_type="tv") for s in SHOWS
                     if needle in s["name"].lower()]
            return self._send(200, {"results": hits})
        if path in ("/3/trending/movie/week", "/3/discover/movie"):
            return self._send(200, {"results": FILMS[:20]})
        if path in ("/3/trending/tv/week", "/3/discover/tv"):
            return self._send(200, {"results": SHOWS})
        m = re.fullmatch(r"/3/tv/(\d+)(/videos)?", path)
        if m:
            show = SHOWS_BY_ID.get(int(m.group(1)))
            if not show:
                return self._send(404, {"status_message": "not found"})
            if m.group(2):
                return self._send(200, {"results": [{
                    "key": "e2eSeries01", "site": "YouTube",
                    "type": "Trailer", "official": True, "name": "Trailer"}]})
            return self._send(200, dict(details(show, SHOWS),
                                        created_by=[{"name": "Ines Moreau"}]))
        m = re.fullmatch(r"/3/movie/(\d+)(/videos)?", path)
        if m:
            film = BY_ID.get(int(m.group(1)))
            if not film:
                return self._send(404, {"status_message": "not found"})
            if m.group(2):
                return self._send(200, {"results": [{
                    "key": "e2eTrailer1", "site": "YouTube", "type": "Trailer",
                    "official": True, "name": "Official Trailer",
                    "published_at": "2024-01-01T00:00:00.000Z"}]})
            return self._send(200, details(film))
        m = re.fullmatch(r"/3/person/(\d+)", path)
        if m and int(m.group(1)) in PEOPLE:
            return self._send(200, {
                "id": int(m.group(1)), "name": PEOPLE[int(m.group(1))],
                "known_for_department": "Acting", "biography": "An actor.",
                "profile_path": None,
                "combined_credits": {
                    "cast": [dict(f, media_type="movie") for f in FILMS[:6]]
                    + [dict(s, media_type="tv") for s in SHOWS[:2]],
                    "crew": []}})
        return self._send(404, {"status_message": "not found"})

    def do_POST(self):
        if urlparse(self.path).path.endswith("/chat/completions"):
            length = int(self.headers.get("Content-Length") or 0)
            return self._send(200, chat_completion(
                json.loads(self.rfile.read(length) or b"{}")))
        return self._send(404, {"error": "not found"})


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 9000), Handler).serve_forever()
