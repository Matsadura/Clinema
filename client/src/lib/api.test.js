import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, request, setUnauthorizedHandler } from './api.js';
import { tokenStore } from './storage.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('request', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    tokenStore.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    setUnauthorizedHandler(null);
  });

  it('returns parsed JSON and sends JSON bodies', async () => {
    fetch.mockResolvedValue(jsonResponse({ ok: true }));
    await expect(request('/thing', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/thing');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('adds the bearer token only for authenticated calls', async () => {
    tokenStore.set('abc');
    fetch.mockImplementation(async () => jsonResponse({}));
    await request('/public');
    await request('/private', { auth: true });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer abc');
  });

  it('surfaces server error messages', async () => {
    fetch.mockResolvedValue(jsonResponse({ error: 'Select at least one mood' }, 400));
    await expect(request('/x')).rejects.toMatchObject({ name: 'ApiError', status: 400, message: 'Select at least one mood' });
  });

  it('falls back to a friendly message when the body is not JSON', async () => {
    fetch.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    const err = await request('/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toMatch(/unavailable/i);
  });

  it('maps network failures', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(request('/x')).rejects.toMatchObject({ code: 'network' });
  });

  it('times out slow requests', async () => {
    vi.useFakeTimers();
    fetch.mockImplementation((_url, { signal }) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    const promise = request('/slow', { timeout: 1000 });
    vi.advanceTimersByTime(1001);
    await expect(promise).rejects.toMatchObject({ code: 'timeout' });
  });

  it('notifies the auth layer on 401 for authenticated calls', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    fetch.mockResolvedValue(jsonResponse({ error: 'Session expired' }, 401));
    await expect(request('/me', { auth: true })).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('builds the suggestions payload', async () => {
    fetch.mockResolvedValue(jsonResponse({ movies: [] }));
    await api.suggestions({ moods: ['Calm'], seenIds: [7, 8] });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ moods: ['Calm'], seen_ids: [7, 8] });
  });
});
