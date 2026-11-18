import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { callsTo, json, routeFetch } from '../test/fetchRoutes.js';

const user = { id: 'u1', first_name: 'Ada', last_name: 'L', email: 'a@example.com' };
const heat = { tmdb_id: 7, title: 'Heat', year: 1995, poster: null };

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('Shared watchlists', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('shows a public watchlist with the owner’s first name', async () => {
    routeFetch({ '/api/shared/abcdefghijklmnopqrstuv': { owner: 'Ada', movies: [heat] } });
    renderAt('/w/abcdefghijklmnopqrstuv');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ada’s watchlist' })).toBeInTheDocument();
    expect(screen.getByText(/1 film to watch/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Heat' })).toBeInTheDocument();
  });

  it('explains a private or revoked link', async () => {
    routeFetch({ '/api/shared/': json({ error: 'gone' }, 404) });
    renderAt('/w/abcdefghijklmnopqrstuv');
    expect(await screen.findByText('This list is private or no longer shared.')).toBeInTheDocument();
  });

  it('lets the owner turn sharing on and copy the link', async () => {
    const u = userEvent.setup();
    window.localStorage.setItem('_token', 't');
    let share = { enabled: false, share_id: null };
    const fetch = routeFetch({
      '/api/auth_validate': user,
      '/api/u1/library': [],
      '/api/u1/watchlist/share': (url, init) => {
        if (init?.method === 'PUT') share = { enabled: JSON.parse(init.body).enabled, share_id: 'abcdefghijklmnopqrstuv' };
        return share;
      },
    });
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderAt('/library?tab=saved');

    await u.click(await screen.findByRole('button', { name: 'Share' }));
    const toggle = await screen.findByRole('switch', { name: 'Public link' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await u.click(toggle);
    expect(await screen.findByRole('textbox', { name: 'Share link' })).toHaveValue(`${window.location.origin}/w/abcdefghijklmnopqrstuv`);
    expect(JSON.parse(callsTo(fetch, '/api/u1/watchlist/share').at(-1)[1].body)).toEqual({ enabled: true });

    await u.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/w/abcdefghijklmnopqrstuv`);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('only offers sharing on the watchlist tab', async () => {
    window.localStorage.setItem('_token', 't');
    routeFetch({ '/api/auth_validate': user, '/api/u1/library': [] });
    renderAt('/library?tab=liked');
    await screen.findByRole('tab', { name: /Liked/ });
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });
});
