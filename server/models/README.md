# Data models

SQLAlchemy 2 models, all inheriting `BaseModel` (`id` UUID string primary key, `created_at`, `updated_at`).
Tables are created automatically on startup by `storage.reload()`.

| Model | Table | Key columns |
|---|---|---|
| `User` | `users` | `email` (unique), `password` (salted PBKDF2-SHA256), `first_name`, `last_name`, `avatar` |
| `Movie` | `movies` | `tmdb_id` (unique), `title`, `description`, `poster`, `year`, `rating`, `popularity`, `language`, `adult` |
| `User_Movie` | `user_movies` | `user_id` → `users.id` (cascade delete), `movie_id` (TMDB id), `like`, `save` |

Notes:

- `to_dict()` never includes `password` or SQLAlchemy internals.
- `User.check_password()` also accepts the unsalted SHA-256 hashes created by the original prototype and
  upgrades them to PBKDF2 on the next successful login.
- `Movie` is a local cache of TMDB metadata, filled automatically when recommendations are served.

## Storage engine (`models/engine/db_storage.py`)

`models.storage` is a `DBStorage` singleton wrapping a thread-local `scoped_session`:

- `reload(url=None)` creates the engine from `DATABASE_URL` (or from the `MYSQL_*` and `DB_HOST` variables),
  retrying while the database starts.
- `new`, `save` (rolls back on error), `delete`, `get(cls, id)`, `get_specific`, `get_specific_double`,
  `all_list`, `all_list_specific`, `count` and `ping`.
