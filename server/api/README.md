# Clinema API reference

Base URL: `/api` (proxied by Nginx in production, by Vite in development).

All bodies are JSON. Errors always have the shape `{"error": "<human-readable message>"}`.
Authenticated routes need `Authorization: Bearer <token>` from `/login`. Routes containing `<user_id>` only
work for the user that owns the token (otherwise `403`).

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/status` | Liveness: `{"status": "OK"}` |
| GET | `/health` | Readiness: `200 {"status":"OK","database":"up"}` or `503` |
| GET | `/stats` | Row counts per table |

## Auth

### `POST /register` (limit: 10 per hour per IP)
```json
{ "email": "ada@example.com", "password": "at-least-8", "first_name": "Ada", "last_name": "Lovelace" }
```
Returns `201` with `{id, email, first_name, last_name, avatar}`. Errors: `400` for invalid input, `409` if the
email is already registered. Extra fields are ignored.

### `POST /login` (limit: 10 per minute per IP)
```json
{ "email": "ada@example.com", "password": "..." }
```
Returns `200 {"token", "user_id", "user"}`, or `401` for bad credentials.

### `GET /auth_validate` 🔒
Returns the current user.

## Weather

### `GET /weather?lat=<float>&lon=<float>` (limit: 60 per minute)
Returns normalised conditions (cached for 10 minutes):
```json
{ "city": "Paris", "country": "FR", "temp": 9, "feels_like": 7, "humidity": 75, "wind_speed": 5.1,
  "condition": "Clear", "description": "clear sky", "icon": "01n", "is_day": false }
```
Errors: `400` for missing or invalid coordinates, `503` if the upstream service is unavailable or not configured.

## Recommendations

### `POST /suggestions` (limit: 20 per minute and 200 per day)
```json
{ "moods": ["Calm", "Curious"], "latitude": 48.85, "longitude": 2.35 }
```
At least one of `moods` or the coordinates is required. Moods are 1–32 letters (spaces, `-` and `'` allowed),
with at most 6 of them.

```json
{
  "movies": [{ "tmdb_id": 157336, "title": "Interstellar", "year": 2014, "rating": 8.5,
               "poster": "https://image.tmdb.org/t/p/w500/...", "backdrop": "...",
               "description": "...", "language": "en", "popularity": 120.3, "adult": false }],
  "suggestions": ["Interstellar", "..."],
  "source": "ai",
  "moods": ["Calm", "Curious"],
  "weather": { "...": "as /weather, or null" },
  "warning": null
}
```
- `source` is `"ai"` when the LLM produced the list, or `"fallback"` when TMDB genre discovery was used.
- `warning` is set when the weather lookup failed but mood-only results could still be produced.
- `503` means no recommendations could be produced at all.

Legacy aliases with the same response: `POST /movies_by_mood` (`{mood}`), `POST /movies_by_weather`
(`{latitude, longitude}`) and `POST /movies_by_mood_and_weather`.

## Movies (local cache of TMDB metadata)

| Method | Path | Description |
|---|---|---|
| GET | `/movies?limit=50&offset=0` | Paginated list (`limit` ≤ 200) |
| GET | `/movies/<tmdb_id>` | One movie. Fetched from TMDB and cached if unknown. |
| POST 🔒 | `/movies` | Cache a movie (`title` and `tmdb_id` required). `409` if it already exists. |

## Library 🔒

| Method | Path | Description |
|---|---|---|
| GET | `/<user_id>/library` | All entries: `[{movie_id, like, save, movie: {...}}]` |
| PUT | `/<user_id>/library/<tmdb_id>` | Upsert `{"like": bool?, "save": bool?}`. The entry is removed when both are false. |
| GET | `/<user_id>/liked`, `/<user_id>/save` | Filtered entries, with `movie` details |
| GET | `/<user_id>/user_movies` | Raw entries |
| POST | `/<user_id>/liked`, `/<user_id>/save` | Legacy create: `{movie_id, like?, save?}`. `409` if the entry exists. |
| PUT / DELETE | `/<user_id>/liked/<entry_id>`, `/<user_id>/save/<entry_id>` | Update or delete one of your own entries |

## Users 🔒

| Method | Path | Description |
|---|---|---|
| GET | `/users/profile` | Current user |
| PUT | `/users/<user_id>/profile` | `{first_name?, last_name?}` (1–128 characters each) |
| DELETE | `/users/<user_id>/profile` | Delete the account and its library |

## Status codes

`400` invalid input · `401` missing, invalid or expired token · `403` not your resource · `404` not found ·
`409` conflict · `429` rate limited · `503` upstream service unavailable · `500` unexpected error (logged)
