// Remembers which films this browser has already been shown, so repeated
// requests (especially for signed-out visitors) don't return the same
// titles. Signed-in users are also de-duplicated server-side.
const KEY = 'clinema:seen';
export const MAX_SEEN = 300;

export function getSeenIds() {
  try {
    const ids = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(ids) ? ids.filter((id) => Number.isInteger(id) && id > 0).slice(-MAX_SEEN) : [];
  } catch {
    return [];
  }
}

export function addSeenIds(ids) {
  const merged = [...new Set([...getSeenIds(), ...ids.filter((id) => Number.isInteger(id) && id > 0)])];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged.slice(-MAX_SEEN)));
  } catch {
    /* storage unavailable: de-duplication still works server-side */
  }
}

export function clearSeen() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
