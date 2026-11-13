"""Shared HTTP session and a small thread-safe TTL cache."""
import threading
from functools import wraps

import requests
from cachetools import TTLCache
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

DEFAULT_TIMEOUT = (3.05, 8)  # (connect, read) seconds


def _build_session():
    session = requests.Session()
    retry = Retry(total=2, backoff_factor=0.3,
                  status_forcelist=(500, 502, 503, 504),
                  allowed_methods=frozenset(["GET"]))
    adapter = HTTPAdapter(max_retries=retry, pool_maxsize=16)
    session.mount("https://", adapter)
    session.headers["User-Agent"] = "Clinema/1.0"
    return session


session = _build_session()


def get_json(url, params, timeout=DEFAULT_TIMEOUT):
    """GET ``url`` and return (status_code, json_or_None)."""
    response = session.get(url, params=params, timeout=timeout)
    try:
        body = response.json()
    except ValueError:
        body = None
    return response.status_code, body


class TTLMemo:
    """Decorator memoising a function's return value for ``ttl`` seconds.

    ``None`` results are not cached so transient failures are retried.
    """

    _registry = []

    def __init__(self, maxsize, ttl):
        self.cache = TTLCache(maxsize=maxsize, ttl=ttl)
        self.lock = threading.Lock()
        TTLMemo._registry.append(self)

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args):
            with self.lock:
                if args in self.cache:
                    return self.cache[args]
            value = func(*args)
            if value is not None:
                with self.lock:
                    self.cache[args] = value
            return value

        wrapper.cache = self.cache
        return wrapper

    @classmethod
    def clear_all(cls):
        """Empty every cache (used by tests)."""
        for memo in cls._registry:
            with memo.lock:
                memo.cache.clear()
