"""Gunicorn configuration for the Clinema API."""
import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = "gthread"
threads = int(os.getenv("GUNICORN_THREADS", "4"))
# LLM (20s) + TMDB lookups can take a while; keep above LLM_TIMEOUT.
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
graceful_timeout = 20
keepalive = 5
worker_tmp_dir = "/dev/shm"
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()
# Load the app once in the master so table creation happens exactly once.
preload_app = True


def post_fork(server, worker):
    """Don't share pooled DB connections across forked workers."""
    from models import storage
    if storage._engine is not None:
        storage._engine.dispose(close=False)
