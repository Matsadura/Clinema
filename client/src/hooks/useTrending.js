import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Shared across mounts so navigating back home doesn't refetch.
let cache = {};

/** This week's trending films, or series with kind 'tv'
 *  (status: loading | ready | error). */
export function useTrending(kind = 'movie') {
  const [state, setState] = useState(cache[kind] ? { status: 'ready', movies: cache[kind] } : { status: 'loading', movies: [] });

  useEffect(() => {
    if (cache[kind]) return undefined;
    const controller = new AbortController();
    api
      .trending(kind, { signal: controller.signal })
      .then((movies) => {
        cache[kind] = movies;
        setState({ status: 'ready', movies });
      })
      .catch((err) => err.code !== 'aborted' && setState({ status: 'error', movies: [] }));
    return () => controller.abort();
  }, [kind]);

  return state;
}

/** Test helper. */
export function resetTrendingCache() {
  cache = {};
}
