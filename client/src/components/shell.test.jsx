import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { resetTrendingCache } from '../hooks/useTrending.js';
import { callsTo, routeFetch } from '../test/fetchRoutes.js';

const user = { id: 'u1', first_name: 'Zidane', last_name: 'Z', email: 'z@example.com' };
const stalker = { tmdb_id: 3, title: 'Stalker', year: 1979, rating: 8.1, poster: 'https://image.tmdb.org/s.jpg' };

function renderApp(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const sidebar = () => screen.getAllByRole('navigation', { name: 'Main' })[0];

describe('App shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete document.documentElement.dataset.theme;
    resetTrendingCache();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows public navigation when signed out', () => {
    routeFetch({});
    renderApp();
    const nav = sidebar();
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Home', 'About']);
    expect(screen.getAllByRole('link', { name: 'Sign in' }).length).toBeGreaterThan(0);
  });

  it('adds History, Library and Settings when signed in', async () => {
    window.localStorage.setItem('_token', 't');
    routeFetch({ '/api/auth_validate': user, '/api/u1/library': [] });
    renderApp();
    await screen.findByRole('button', { name: 'Account menu for Zidane' });
    expect(within(sidebar()).getAllByRole('link').map((l) => l.textContent)).toEqual(['Home', 'History', 'Library', 'About', 'Settings']);
  });

  it('toggles and remembers the theme', async () => {
    const u = userEvent.setup();
    routeFetch({});
    renderApp();
    const toggle = screen.getAllByRole('switch', { name: /Dark mode/ })[0];
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');

    await u.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('clinema:theme')).toBe('light');
  });

  it('searches films (debounced, keyboard) and opens the result in the drawer', async () => {
    const u = userEvent.setup();
    const fetch = routeFetch({ '/api/movies/search': [stalker, { ...stalker, tmdb_id: 4, title: 'Stalker 2' }] });
    renderApp();

    const box = screen.getAllByRole('combobox', { name: 'Search for a film' })[0];
    await u.type(box, 's');
    expect(callsTo(fetch, '/api/movies/search')).toHaveLength(0); // under 2 characters
    await u.type(box, 'talker');
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([expect.stringContaining('Stalker'), expect.stringContaining('Stalker 2')]);
    expect(callsTo(fetch, '/api/movies/search')).toHaveLength(1); // debounced
    expect(callsTo(fetch, '/api/movies/search')[0][0]).toBe('/api/movies/search?q=stalker');

    await u.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByRole('dialog', { name: 'Stalker' })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('tells you when a search finds nothing', async () => {
    const u = userEvent.setup();
    routeFetch({ '/api/movies/search': [] });
    renderApp();
    await u.type(screen.getAllByRole('combobox')[0], 'zzzz');
    expect(await screen.findByText('No films match “zzzz”.')).toBeInTheDocument();
  });
});

describe('History', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetTrendingCache();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('groups activity by day and names what happened', async () => {
    window.localStorage.setItem('_token', 't');
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 10 * 86_400_000);
    routeFetch({
      '/api/auth_validate': user,
      '/api/u1/library': [],
      '/api/u1/history': [
        { movie_id: 3, movie: stalker, last_event: 'like', last_at: now.toISOString(), events: ['like', 'view', 'recommended'], moods: ['Calm'] },
        { movie_id: 9, movie: { tmdb_id: 9, title: 'Heat', year: 1995 }, last_event: 'recommended', last_at: lastWeek.toISOString(), events: ['recommended'], moods: ['Angry'] },
      ],
    });
    renderApp('/history');

    const today = await screen.findByRole('region', { name: 'Today' });
    expect(within(today).getByText('Stalker')).toBeInTheDocument();
    expect(within(today).getByText('Liked')).toBeInTheDocument();
    expect(within(today).getByText('For Calm')).toBeInTheDocument();
    expect(screen.getByText('Heat').closest('section')).not.toBe(today);
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });
});
