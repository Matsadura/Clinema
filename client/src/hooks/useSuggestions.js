import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { addSeenIds, getSeenIds } from '../lib/seen.js';

/**
 * Fetch AI recommendations for a set of moods.
 * Pass `enabled: false` to skip fetching (e.g. when no mood is chosen).
 * Every response is remembered locally and sent back as `seen_ids`, so
 * `refresh()` returns a genuinely different set of films.
 *
 * status: 'idle' | 'loading' | 'success' | 'error'
 */
export function useSuggestions({ moods = [], enabled = true }) {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef(null);
  const moodKey = moods.join(',');

  useEffect(() => {
    if (!enabled) return undefined;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((s) => ({ status: 'loading', data: s.data, error: null }));

    const request = {
      moods: moodKey ? moodKey.split(',') : [],
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
  }, [enabled, moodKey, attempt]);

  // Same request again: thanks to seen_ids the server returns new films.
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry, refresh: retry };
}
