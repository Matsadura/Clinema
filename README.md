<p align="center">
  <img src="client/src/images/brand-logo-dark.svg" alt="Clinema" width="320" />
</p>

<p align="center">
  <strong>The right movie for how you feel — and what it's like outside.</strong><br />
  AI-powered film recommendations from your mood, your local weather, or both.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Flask" src="https://img.shields.io/badge/Flask-3-000000?logo=flask&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" />
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
  <img alt="Groq" src="https://img.shields.io/badge/AI-Groq_·_GPT--OSS-F55036" />
</p>

---

## Overview

Choosing a film is harder than watching one. **Clinema** asks how you want to feel, optionally looks up the
weather where you are, and has an LLM curate a list of films that fit the moment. Every suggestion is matched
against [TMDB](https://www.themoviedb.org/) for posters, ratings and synopses, and signed-in users can like
films and build a watchlist.

Clinema started as a hackathon project and has since been hardened for production: secrets live server-side,
external APIs have timeouts, caching and fallbacks, the UI handles every loading and failure state, and the whole
stack ships as small, non-root Docker images with health checks.

## Features

- 🎭 **Mood matching:** pick up to six moods, from *Joyful* to *Reflective*.
- 🌦️ **Weather-aware:** share your location to factor in live OpenWeather conditions. Denied or unavailable
  location is handled gracefully.
- 🤖 **AI curation with graceful degradation:** an open-weight model on Groq (GPT-OSS 120B by default) suggests titles. If the model is slow,
  down or misconfigured, Clinema falls back to TMDB genre discovery, so users always get results.
- 🎬 **Rich details:** posters, ratings, synopses, and a "Why this pick" explanation for every film.
- 🔁 **Never the same list twice:** everything you've been shown, opened, liked, dismissed or saved is
  excluded, both in the prompt and after generation. "Show different picks" always brings new films.
- 🧠 **Learns your taste:** likes (+2), dislikes (−2), saves (+1) and opened details (+0.5) build a
  time-decayed taste profile (genres, directors, themes, eras, languages, tone). It's injected into
  every prompt and shown on your profile page.
- ❤️ **Library:** likes, a watchlist and a "Not for me" list, with optimistic updates.
- 🔐 **Accounts:** JWT auth, salted PBKDF2 password hashing, profile editing and account deletion.
- 📱 **Responsive and accessible:** mobile-first layout, keyboard navigation, focus-managed dialogs,
  reduced-motion support.
- ⚡ **Fast:** route-level code splitting, server-side TTL caches, parallel TMDB lookups, gzip and immutable
  asset caching through Nginx.

## Architecture

```text
┌───────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
│   Browser     │      │   web (nginx, :8080)    │      │  api (gunicorn/Flask)│
│  React SPA    │─────▶│  static SPA + gzip      │─────▶│  /api/*  :5000       │
└───────────────┘      │  /api → reverse proxy   │      │  JWT · rate limiting │
                       └─────────────────────────┘      └──────────┬───────────┘
                                                                   │
                           ┌──────────────────────┬────────────────┼──────────────┐
                           ▼                      ▼                ▼              ▼
                     OpenWeather API         Groq LLM          TMDB API     MySQL 8.4 (db)
                     (current weather)  (title suggestions) (movie metadata) users · library
```

**Recommendation pipeline** (`server/api/services/`):

1. **Validate** the moods against a strict allow-pattern (prompt-injection hardening) and the coordinates.
2. **Weather:** fetch the current conditions, cached for 10 minutes per ~1 km grid cell.
3. **Context** (`taste.py`): load the user's persisted taste profile and build a hard exclusion set. The set
   covers films recommended in the last 30 days plus everything viewed, liked, disliked or saved; guests send
   `seen_ids` from the browser instead.
4. **LLM** (`llm.py`): one fresh, uncached generation. The prompt carries the vibe, a compact taste summary
   (or a cold-start note), the exclusion list, anti-blockbuster rules and two randomly chosen diversity
   constraints. Output follows a strict JSON schema (`title, year, genres, director, country, tone,
   mood_weather_fit, personalized_reason`). Sampling uses temperature 0.85 with frequency and presence
   penalties; models that reject a parameter are retried without it. A circuit breaker and a model fallback
   list protect against outages.
5. **Screen and resolve** (`recommender.py`): drop excluded titles (normalised), repeat directors and all but
   one over-exposed staple. Resolve on TMDB in parallel and drop excluded TMDB ids. If too few remain, retry
   once with the rejected titles excluded, then backfill from TMDB `discover`, preferring genres you like and
   leaving out ones you dislike.
6. **Learn:** shown films are logged as `recommended`. Likes, dislikes, saves and opened details are logged
   with weights, enriched with TMDB director and keywords, and folded into the profile straight away.

| Directory | Contents |
|---|---|
| `client/` | React 18 SPA (Vite, Tailwind, React Router). `src/lib/api.js` is the single network layer. |
| `client/nginx.conf` | Production web server: SPA routing, `/api` proxy, caching, security headers. |
| `server/api/` | Flask app factory, routes (`views/`) and external integrations (`services/`). |
| `server/models/` | SQLAlchemy models and the storage engine. |
| `server/migrations/` | Alembic migrations, applied automatically on startup. |
| `server/tests/` | Pytest suite. External APIs are mocked, and the database is in-memory SQLite. |
| `docker-compose.yml` | Production-style stack: `web`, `api` and `db`, with health checks. |

## Getting started

### Prerequisites

You need free API keys from [OpenWeather](https://home.openweathermap.org/api_keys),
[Groq](https://console.groq.com/keys) and [TMDB](https://www.themoviedb.org/settings/api).

```bash
git clone https://github.com/Matsadura/Clinema.git
cd Clinema
cp .env.example .env      # then fill in the keys and passwords
python3 -c "import secrets; print(secrets.token_hex(32))"   # paste as JWT_SECRET_KEY
```

### Option A: Docker (recommended)

Requires Docker with Compose v2.

```bash
docker compose up -d --build
docker compose ps          # wait until all three services are "healthy"
```

Open **http://localhost:8080**. Set `WEB_PORT` in `.env` to use a different port.

Useful commands:

```bash
docker compose logs -f api               # follow API logs
docker compose down                      # stop (data persists in the db_data volume)
docker compose down -v                   # stop and delete the database volume
```

### Option B: Local development

Requires Python 3.10+ and Node 20.19+. Start only MySQL in Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

Run the API (port 5000):

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m api.app
```

Run the client (port 5173, which proxies `/api` to the Flask server):

```bash
cd client
npm ci
npm run dev
```

> Prefer no MySQL at all? Set `DATABASE_URL=sqlite:///clinema.db` before `python -m api.app`.

### Environment variables

All configuration lives in a single root `.env` (see [`.env.example`](.env.example)).

| Variable | Required | Description |
|---|---|---|
| `OPENWEATHER_API_KEY` | ✅ | OpenWeather API key |
| `GROQ_API_KEY` | ✅ | Groq API key (without it, Clinema uses the TMDB genre fallback only) |
| `TMDB_API_KEY` | ✅ | TMDB v3 API key |
| `JWT_SECRET_KEY` | ✅ | ≥ 32 random characters. Startup fails in production without it. |
| `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | ✅ (Docker) | Database credentials |
| `MYSQL_DATABASE`, `MYSQL_USER` | | Default to `clinema` |
| `APP_ENV` | | `production` (default in compose) or `development` |
| `GROQ_MODEL` | | Comma-separated models in order of preference (default `openai/gpt-oss-120b,openai/gpt-oss-20b`). Retired models are skipped automatically. |
| `LLM_TIMEOUT` | | Seconds before falling back (default `20`) |
| `JWT_EXPIRES_HOURS` | | Token lifetime (default `24`) |
| `CORS_ORIGINS` | | Comma-separated origins. Only needed if the SPA is hosted on another domain. |
| `DATABASE_URL` | | Full SQLAlchemy URL that overrides the `MYSQL_*` settings |
| `RATELIMIT_STORAGE_URI` | | e.g. `redis://…` to share rate limits across workers or hosts |
| `WEB_PORT` | | Host port for the web container (default `8080`) |

### Database migrations

The schema is managed with Alembic and upgraded automatically when the API starts. Databases created by
earlier releases are adopted without data loss. Run these from `server/`:

```bash
alembic upgrade head                                  # apply
alembic downgrade -1                                  # revert the latest migration
alembic revision --autogenerate -m "describe change"  # after editing models
alembic check                                         # verify models and migrations agree
```

## Testing and quality

```bash
cd server && pytest              # API, services and pipeline tests (no network needed)
cd server && pycodestyle api models tests
cd client && npm test            # Vitest + Testing Library
cd client && npm run lint && npm run build
```

## API

The API is documented in [`server/api/README.md`](server/api/README.md). Key endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Readiness probe (checks the database) |
| `GET` | `/api/weather?lat=&lon=` | Normalised current weather |
| `POST` | `/api/suggestions` | `{moods?, latitude?, longitude?}` → movies |
| `POST` | `/api/register` · `/api/login` | Account creation and JWT login |
| `GET` | `/api/<user_id>/library` | Liked and saved films, with details |
| `PUT` | `/api/<user_id>/library/<tmdb_id>` | Set `{like?, save?, dislike?}` |
| `POST` | `/api/<user_id>/interactions` | Log a view `{movie_id}` |
| `GET` | `/api/<user_id>/taste` | Learned taste profile and its prompt summary |

## Deployment notes

- **Single VM** (e.g. a small VPS or Lightsail): install Docker, copy the repo and `.env`, run
  `docker compose up -d --build`, and put a TLS-terminating proxy (Caddy, Traefik or a cloud load balancer) in
  front of port 8080.
- **Managed platforms:** the `server/` and `client/` Dockerfiles are independent, so they can run as two services
  on Render, Fly.io, Railway or Cloud Run with a managed MySQL. Set `DATABASE_URL`, and set `API_UPSTREAM` on the
  web service to the API's internal URL. Also set `NGINX_RESOLVER` to that platform's DNS resolver (the default,
  `127.0.0.11`, is Docker's embedded DNS).
- Set `TRUSTED_PROXIES` to the number of proxies in front of the API so rate limiting sees real client IPs.
  Compose sets it to `1` for the bundled Nginx.
- Rate limits are stored in memory per Gunicorn worker by default. Use Redis (`RATELIMIT_STORAGE_URI`) when you
  scale out.

## Authors

- [Ali JBARI](https://github.com/ila36IX)
- [Badr ANNABI](https://github.com/Badr-Annabi)
- [Karim ASSIHOUT](https://github.com/ashtkarim)
- [Oumaima NAANAA](https://github.com/naanaa59)
- [Radouane ABOUNOUAS](https://github.com/RadouaneAbn)
- [Zidane ZAOUI](https://github.com/matsadura)

Movie data is provided by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed
or certified by TMDB. Weather data is from [OpenWeather](https://openweathermap.org/).
