// Central API client. Every network call in the app goes through `request`
// so timeouts, auth headers and error messages are handled consistently.
import { tokenStore } from './storage.js';

export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const DEFAULT_TIMEOUT = 15_000;
// The AI pipeline (LLM + TMDB lookups) can take a while.
export const SUGGESTION_TIMEOUT = 45_000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const FRIENDLY = {
  0: "Can't reach the server. Check your connection and try again.",
  401: 'Please sign in to continue.',
  403: "You don't have access to that.",
  404: 'Not found.',
  429: "You're going a little fast. Please wait a moment and try again.",
  500: 'Something went wrong on our side. Please try again.',
  502: 'The server is unavailable right now. Please try again shortly.',
  503: 'A service we depend on is unavailable. Please try again shortly.',
  504: 'The server took too long to respond. Please try again.',
};

let onUnauthorized = null;
/** Register a callback fired when an authenticated request gets a 401. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * Perform a JSON request against the API.
 * @param {string} path  Path relative to API_BASE, e.g. "/suggestions".
 * @param {object} opts  { method, body, auth, timeout, signal }
 * @returns {Promise<any>} Parsed JSON body.
 * @throws {ApiError}
 */
export async function request(path, { method = 'GET', body, auth = false, timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeout);
  const abortFromCaller = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', abortFromCaller);

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    if (signal?.aborted) throw new ApiError('Request cancelled', { code: 'aborted' });
    if (controller.signal.aborted) {
      throw new ApiError('This is taking longer than expected. Please try again.', { code: 'timeout' });
    }
    throw new ApiError(FRIENDLY[0], { code: 'network' });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && onUnauthorized) onUnauthorized();
    const message = (data && data.error) || FRIENDLY[response.status] || FRIENDLY[500];
    throw new ApiError(message, { status: response.status });
  }
  return data;
}

// ---- Endpoints ------------------------------------------------------------
export const api = {
  login: (email, password) => request('/login', { method: 'POST', body: { email, password } }),
  register: (payload) => request('/register', { method: 'POST', body: payload }),
  me: () => request('/auth_validate', { auth: true }),
  updateProfile: (userId, payload) =>
    request(`/users/${encodeURIComponent(userId)}/profile`, { method: 'PUT', body: payload, auth: true }),
  deleteAccount: (userId) =>
    request(`/users/${encodeURIComponent(userId)}/profile`, { method: 'DELETE', auth: true }),

  // Sends the token when signed in so results are personalised; seenIds
  // lets the server avoid repeating films this browser already showed.
  suggestions: ({ moods = [], seenIds = [] }, opts = {}) =>
    request('/suggestions', {
      method: 'POST',
      body: {
        moods,
        ...(seenIds.length ? { seen_ids: seenIds } : {}),
      },
      auth: true,
      timeout: SUGGESTION_TIMEOUT,
      ...opts,
    }),

  searchMovies: (query, opts) => request(`/movies/search?q=${encodeURIComponent(query)}`, opts),
  trending: (opts) => request('/movies/trending', opts),
  history: (userId, opts) => request(`/${encodeURIComponent(userId)}/history`, { auth: true, ...opts }),

  library: (userId, opts) => request(`/${encodeURIComponent(userId)}/library`, { auth: true, ...opts }),
  setLibraryFlags: (userId, tmdbId, flags) =>
    request(`/${encodeURIComponent(userId)}/library/${tmdbId}`, { method: 'PUT', body: flags, auth: true }),
  logView: (userId, tmdbId) =>
    request(`/${encodeURIComponent(userId)}/interactions`, {
      method: 'POST',
      body: { movie_id: tmdbId, event: 'view' },
      auth: true,
    }),
  taste: (userId, opts) => request(`/${encodeURIComponent(userId)}/taste`, { auth: true, ...opts }),

  // Bring-your-own API keys (stored encrypted; only the last 4 chars come back)
  apiKeys: (userId, opts) => request(`/${encodeURIComponent(userId)}/api-keys`, { auth: true, ...opts }),
  saveApiKey: (userId, provider, key) =>
    request(`/${encodeURIComponent(userId)}/api-keys/${provider}`, {
      method: 'PUT',
      body: { key },
      auth: true,
      timeout: 20_000,
    }),
  deleteApiKey: (userId, provider) =>
    request(`/${encodeURIComponent(userId)}/api-keys/${provider}`, { method: 'DELETE', auth: true }),
};
