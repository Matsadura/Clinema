import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { sessionCache } from '../lib/storage.js';

/*
 * Shares the user's location and current weather across the app so the
 * browser only prompts once and the weather is fetched once per session.
 *
 * locationStatus: 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'
 * weatherStatus:  'idle' | 'loading' | 'ready' | 'error'
 */
const LocationContext = createContext(null);
const COORDS_KEY = 'clinema:coords';

const GEO_ERRORS = {
  1: 'Location access was denied. You can still get recommendations by mood.',
  2: "We couldn't determine your location. You can still pick a mood.",
  3: 'Finding your location timed out. Please try again.',
};

export function LocationProvider({ children }) {
  const cached = sessionCache.get(COORDS_KEY);
  const [coords, setCoords] = useState(cached);
  const [locationStatus, setLocationStatus] = useState(cached ? 'ready' : 'idle');
  const [locationError, setLocationError] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState('idle');
  const [weatherError, setWeatherError] = useState(null);
  const weatherRequest = useRef(null);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unavailable');
      setLocationError("Your browser doesn't support location. You can still pick a mood.");
      return;
    }
    setLocationStatus('locating');
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        const next = {
          latitude: Number(c.latitude.toFixed(4)),
          longitude: Number(c.longitude.toFixed(4)),
        };
        sessionCache.set(COORDS_KEY, next);
        setCoords(next);
        setLocationStatus('ready');
      },
      (err) => {
        setLocationStatus(err.code === 1 ? 'denied' : 'unavailable');
        setLocationError(GEO_ERRORS[err.code] || GEO_ERRORS[2]);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  }, []);

  // If the user already granted permission earlier, locate automatically
  // instead of waiting for a click.
  useEffect(() => {
    if (coords || !navigator.permissions?.query) return;
    let active = true;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (active && result.state === 'granted') requestLocation();
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [coords, requestLocation]);

  const loadWeather = useCallback(() => {
    if (!coords) return;
    weatherRequest.current?.abort();
    const controller = new AbortController();
    weatherRequest.current = controller;
    setWeatherStatus('loading');
    setWeatherError(null);
    api
      .weather(coords.latitude, coords.longitude, { signal: controller.signal })
      .then((data) => {
        setWeather(data);
        setWeatherStatus('ready');
      })
      .catch((err) => {
        if (err.code === 'aborted') return;
        setWeatherError(err.message);
        setWeatherStatus('error');
      });
  }, [coords]);

  useEffect(() => {
    loadWeather();
    return () => weatherRequest.current?.abort();
  }, [loadWeather]);

  const value = useMemo(
    () => ({
      coords,
      locationStatus,
      locationError,
      requestLocation,
      weather,
      weatherStatus,
      weatherError,
      retryWeather: loadWeather,
    }),
    [coords, locationStatus, locationError, requestLocation, weather, weatherStatus, weatherError, loadWeather],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocationWeather() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationWeather must be used inside <LocationProvider>');
  return ctx;
}
