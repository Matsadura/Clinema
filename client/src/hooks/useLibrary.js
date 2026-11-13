import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * The signed-in user's liked/saved movies.
 *
 * entries: { [tmdbId]: { like, save, movie } }
 * toggle(movie, 'like' | 'save') updates optimistically and rolls back on
 * failure.
 */
export function useLibrary() {
  const { user, isAuthenticated } = useAuth();
  const [entries, setEntries] = useState({});
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const userId = user?.id;
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setEntries({});
      setStatus('idle');
      return undefined;
    }
    const controller = new AbortController();
    setStatus('loading');
    api
      .library(userId, { signal: controller.signal })
      .then((rows) => {
        const map = {};
        for (const row of rows || []) {
          map[row.movie_id] = { like: !!row.like, save: !!row.save, movie: row.movie };
        }
        setEntries(map);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        if (err.code === 'aborted') return;
        setError(err.message);
        setStatus('error');
      });
    return () => controller.abort();
  }, [isAuthenticated, userId, reloadKey]);

  const toggle = useCallback(
    async (movie, flag) => {
      if (!userId) return false;
      const id = movie.tmdb_id;
      const previous = entriesRef.current[id];
      const base = previous || { like: false, save: false, movie };
      const nextValue = !base[flag];
      setEntries((current) => ({
        ...current,
        [id]: { ...(current[id] || base), movie: base.movie || movie, [flag]: nextValue },
      }));
      try {
        await api.setLibraryFlags(userId, id, { [flag]: nextValue });
        return true;
      } catch (err) {
        setEntries((current) => {
          const copy = { ...current };
          if (previous) copy[id] = previous;
          else delete copy[id];
          return copy;
        });
        setError(err.message);
        return false;
      }
    },
    [userId],
  );

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  return { entries, status, error, toggle, reload, clearError: () => setError(null) };
}
