import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { addSeenIds, getSeenIds } from '../lib/seen.js';

/**
 * Fetch AI recommendations for a set of moods and/or coordinates.
 * Pass `enabled: false` to wait (e.g. until location is known).
 * Every response is remembered locally and sent back as `seen_ids`, so
 * `refresh()` returns a genuinely different set of films.
 *
 * status: 'idle' | 'loading' | 'success' | 'error'
 */
export function useSuggestions({ moods = [], coords = null, enabled = true }) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef(null);
  const moodKey = moods.join(',');
  const lat = coords?.latitude;
  const lon = coords?.longitude;

  useEffect(() => {
    if (!enabled) return undefined;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((s) => ({ status: 'loading', data: s.data, error: null }));

    const request = {
      moods: moodKey ? moodKey.split(',') : [],
      coords: lat !== undefined && lon !== undefined ? { latitude: lat, longitude: lon } : null,
      seenIds: getSeenIds(),
    };
    api
      .suggestions(request, { signal: controller.signal })
      .then((data) => {
        addSeenIds((data?.movies || []).map((m) => m.tmdb_id));
        setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (error.code === 'aborted') return;
        setState({ status: 'error', data: null, error });
      });

    return () => controller.abort();
  }, [enabled, moodKey, lat, lon, attempt]);

  // Same request again: thanks to seen_ids the server returns new films.
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry, refresh: retry };
}
