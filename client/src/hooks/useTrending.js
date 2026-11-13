import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Shared across mounts so navigating back home doesn't refetch.
let cache = null;

/** This week's trending films (status: loading | ready | error). */
export function useTrending() {
  const [state, setState] = useState(cache ? { status: 'ready', movies: cache } : { status: 'loading', movies: [] });

  useEffect(() => {
    if (cache) return undefined;
    const controller = new AbortController();
    api
      .trending({ signal: controller.signal })
      .then((movies) => {
        cache = movies;
        setState({ status: 'ready', movies });
      })
      .catch((err) => err.code !== 'aborted' && setState({ status: 'error', movies: [] }));
    return () => controller.abort();
  }, []);

  return state;
}

/** Test helper. */
export function resetTrendingCache() {
  cache = null;
}
