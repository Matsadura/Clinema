import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * The signed-in user's library, shared app-wide through LibraryProvider so
 * every grid, shelf and the detail drawer see the same state.
 *
 * entries: { [tmdbId]: { like, save, dislike, seen, movie } }
 * toggle(movie, 'like' | 'save' | 'dislike' | 'seen') updates
 * optimistically and rolls back on failure. Like and dislike are mutually
 * exclusive. logView(movie) records a browsing signal for taste learning.
 */
function useLibraryState() {
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
          map[row.movie_id] = {
            like: !!row.like,
            save: !!row.save,
            dislike: !!row.dislike,
            seen: !!row.seen,
            movie: row.movie,
          };
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
      const base = previous || { like: false, save: false, dislike: false, seen: false, movie };
      const nextValue = !base[flag];
      const changes = { [flag]: nextValue };
      if (nextValue && flag === 'like') changes.dislike = false;
      if (nextValue && flag === 'dislike') changes.like = false;
      setEntries((current) => ({
        ...current,
        [id]: { ...(current[id] || base), movie: base.movie || movie, ...changes },
      }));
      try {
        await api.setLibraryFlags(userId, id, changes);
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

  // Opening a film's details is a (weak) positive signal. Logged once per
  // film per page view; failures are silent because it is best effort.
  const viewed = useRef(new Set());
  const logView = useCallback(
    (movie) => {
      if (!userId || !movie?.tmdb_id || viewed.current.has(movie.tmdb_id)) return;
      viewed.current.add(movie.tmdb_id);
      api.logView(userId, movie.tmdb_id).catch(() => {});
    },
    [userId],
  );

  const clearError = useCallback(() => setError(null), []);
  return useMemo(
    () => ({ entries, status, error, toggle, logView, reload, clearError }),
    [entries, status, error, toggle, logView, reload, clearError],
  );
}

const LibraryContext = createContext(null);

export function LibraryProvider({ children }) {
  return createElement(LibraryContext.Provider, { value: useLibraryState() }, children);
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
