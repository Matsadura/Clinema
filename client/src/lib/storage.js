// localStorage can throw (private mode, disabled storage). Never let that
// crash the app.
function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

const TOKEN_KEY = '_token';
const LEGACY_USER_KEY = '_user_id';

export const tokenStore = {
  get: () => safeGet(TOKEN_KEY),
  set: (token) => safeSet(TOKEN_KEY, token),
  clear: () => {
    safeSet(TOKEN_KEY, null);
    safeSet(LEGACY_USER_KEY, null);
  },
};

export const sessionCache = {
  get(key) {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / disabled storage */
    }
  },
};
