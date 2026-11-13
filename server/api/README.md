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

## Recommendations

### `POST /suggestions` (limit: 20 per minute and 200 per day)
```json
{ "moods": ["Calm", "Curious"], "seen_ids": [550, 13] }
```
Optionally authenticated. With a token, results are personalised from the user's taste profile, everything
the user has been shown, viewed, liked, disliked or saved is excluded, and the returned films are recorded
so they won't be repeated. `seen_ids` (up to 300 TMDB ids) lets anonymous clients avoid repeats too.
At least one mood is required. Moods are 1–32 letters (spaces, `-` and `'` allowed), with at most 6 of them.

```json
{
  "movies": [{ "tmdb_id": 157336, "title": "Interstellar", "year": 2014, "rating": 8.5,
               "poster": "https://image.tmdb.org/t/p/w500/...", "backdrop": "...",
               "description": "...", "language": "en", "popularity": 120.3, "adult": false,
               "genres": ["Science Fiction", "Drama"], "director": "Christopher Nolan",
               "why": "personalised reason", "fit": "why it suits the mood",
               "tone": "awe-struck, melancholic", "source": "ai" }],
  "suggestions": ["Interstellar", "..."],
  "source": "ai",
  "personalized": true,
  "excluded": 24,
  "moods": ["Calm", "Curious"],
  "key_sources": { "groq": "server", "tmdb": "server" }
}
```
- `source` is `"ai"` when the LLM produced the list, or `"fallback"` when TMDB genre discovery was used.
- `503` means no recommendations could be produced at all.

Legacy alias with the same response: `POST /movies_by_mood` (`{"mood": [...]}`).

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
| PUT | `/<user_id>/library/<tmdb_id>` | Upsert `{"like"?, "save"?, "dislike"?}` (booleans). Like and dislike are mutually exclusive. The entry is removed when all are false. Each change is logged and updates the taste profile. |
| POST | `/<user_id>/interactions` | Log a browsing signal `{"movie_id": 550, "event": "view"}` (`201`) |
| GET | `/<user_id>/taste` | `{profile, summary, personalized}`: the learned profile and the text injected into prompts |
| GET | `/<user_id>/disliked` | Disliked entries, with `movie` details |
| GET | `/<user_id>/liked`, `/<user_id>/save` | Filtered entries, with `movie` details |
| GET | `/<user_id>/user_movies` | Raw entries |
| POST | `/<user_id>/liked`, `/<user_id>/save` | Legacy create: `{movie_id, like?, save?}`. `409` if the entry exists. |
| PUT / DELETE | `/<user_id>/liked/<entry_id>`, `/<user_id>/save/<entry_id>` | Update or delete one of your own entries |

## Bring-your-own API keys 🔒

Providers: `groq`, `tmdb`. A user's own key is tried first for that user's requests; if it's
missing or rejected, the server's key is used. Rejected keys are marked `invalid`.

| Method | Path | Description |
|---|---|---|
| GET | `/<user_id>/api-keys` | `[{provider, label, docs_url, configured, last4, status, validated_at, fallback_available}]` |
| PUT | `/<user_id>/api-keys/<provider>` | `{"key": "..."}` is verified with the provider, then stored encrypted. `200` returns the masked entry. `400` means invalid or rejected, `502` means the provider couldn't verify it, and `404` means an unknown provider. Limited to 10 per hour. |
| DELETE | `/<user_id>/api-keys/<provider>` | Remove the key and fall back to the server's. `404` if none was saved. |

`POST /suggestions` responses include `key_sources`, e.g. `{"groq": "user", "tmdb": "server"}`.

## Users 🔒

| Method | Path | Description |
|---|---|---|
| GET | `/users/profile` | Current user |
| PUT | `/users/<user_id>/profile` | `{first_name?, last_name?}` (1–128 characters each) |
| DELETE | `/users/<user_id>/profile` | Delete the account and its library |

## Status codes

`400` invalid input · `401` missing, invalid or expired token · `403` not your resource · `404` not found ·
`409` conflict · `429` rate limited · `503` upstream service unavailable · `500` unexpected error (logged)
