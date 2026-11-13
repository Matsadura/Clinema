import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Fetch AI recommendations for a set of moods and/or coordinates.
 * Pass `enabled: false` to wait (e.g. until location is known).
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
    };
    api
      .suggestions(request, { signal: controller.signal })
      .then((data) => setState({ status: 'success', data, error: null }))
      .catch((error) => {
        if (error.code === 'aborted') return;
        setState({ status: 'error', data: null, error });
      });

    return () => controller.abort();
  }, [enabled, moodKey, lat, lon, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
