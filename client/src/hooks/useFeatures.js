import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// Optional server features (e.g. password reset needs SMTP). Fetched once
// per page load and shared; everything is off until the server says so.
let cache = null;
let pending = null;

export function resetFeaturesCache() {
  cache = null;
  pending = null;
}

export function useFeatures() {
  const [features, setFeatures] = useState(cache || {});
  useEffect(() => {
    if (cache) return undefined;
    let live = true;
    pending ||= api.features().catch(() => ({}));
    pending.then((value) => {
      cache = value || {};
      if (live) setFeatures(cache);
    });
    return () => {
      live = false;
    };
  }, []);
  return features;
}
