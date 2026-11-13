import { vi } from 'vitest';

export const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

/**
 * A fetch mock that answers by URL path. `routes` maps a path prefix
 * (e.g. '/api/movies/trending') to a body, a Response, or a function
 * (url, init) => body|Response. Unmatched requests get [] (200).
 */
export function routeFetch(routes) {
  const mock = vi.fn(async (url, init) => {
    const path = String(url);
    const key = Object.keys(routes)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => path.startsWith(prefix));
    let reply = key ? routes[key] : [];
    if (typeof reply === 'function') reply = await reply(path, init);
    return reply instanceof Response ? reply : json(reply);
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Calls made to a given path prefix. */
export const callsTo = (mock, prefix) => mock.mock.calls.filter(([url]) => String(url).startsWith(prefix));
