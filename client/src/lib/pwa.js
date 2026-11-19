// Service worker registration and the "Install app" prompt.
import { useEffect, useState } from 'react';

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* the app works fine without it */
    });
  });
}

// Chrome/Edge/Android fire beforeinstallprompt early; keep it for the button.
let deferred = null;
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    listeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((fn) => fn(false));
  });
}

/** [canInstall, install()] — install() shows the browser's install dialog. */
export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferred);
  useEffect(() => {
    listeners.add(setAvailable);
    return () => listeners.delete(setAvailable);
  }, []);
  const install = async () => {
    if (!deferred) return;
    const prompt = deferred;
    deferred = null;
    setAvailable(false);
    await prompt.prompt();
  };
  return [available, install];
}

/** True while the browser reports no network connection. */
export function useOffline() {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return offline;
}
