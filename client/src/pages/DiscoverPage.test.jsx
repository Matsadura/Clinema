import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { resetTrendingCache } from '../hooks/useTrending.js';
import { callsTo, json, routeFetch } from '../test/fetchRoutes.js';

const movies = [
  { tmdb_id: 1, title: 'Amélie', year: 2001, rating: 7.9, genres: ['Comedy'], poster: 'https://image.tmdb.org/a.jpg' },
  { tmdb_id: 2, title: 'Paddington', year: 2014, rating: 7.2, genres: ['Family'], poster: 'https://image.tmdb.org/p.jpg' },
];
const trending = [
  { tmdb_id: 50, title: 'The Odyssey', year: 2026, rating: 7.1, poster: 'https://image.tmdb.org/o.jpg', backdrop: 'https://image.tmdb.org/t/p/w780/o.jpg' },
  { tmdb_id: 51, title: 'Ebenezer', year: 2026, rating: 6.4, poster: 'https://image.tmdb.org/e.jpg', backdrop: 'https://image.tmdb.org/t/p/w780/e.jpg' },
];

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <App />
        <Where />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const suggestions = (body) => ({ '/api/movies/trending': trending, '/api/suggestions': body });

describe('Home', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    resetTrendingCache();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is never empty: a featured backdrop and a trending shelf before any mood', async () => {
    const fetch = routeFetch({ '/api/movies/trending': trending });
    renderAt('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Find your next favourite film.');
    const shelf = await screen.findByRole('region', { name: 'Trending this week' });
    expect(within(shelf).getByText('The Odyssey')).toBeInTheDocument();
    expect(screen.getByText('Featured tonight')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Recommendations' })).not.toBeInTheDocument();
    expect(callsTo(fetch, '/api/suggestions')).toHaveLength(0);
  });

  it('loads recommendations for the moods in the URL, with poster skeletons first', async () => {
    const fetch = routeFetch(suggestions({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/?moods=Calm,Bogus');

    expect(screen.getByLabelText('Loading movies')).toBeInTheDocument();
    const recs = await screen.findByRole('region', { name: 'Recommendations' });
    expect(await within(recs).findByText('Amélie')).toBeInTheDocument();
    expect(within(recs).getByText('2 films for Calm')).toBeInTheDocument();
    expect(JSON.parse(callsTo(fetch, '/api/suggestions')[0][1].body)).toEqual({ moods: ['Calm'] });
  });

  it('searches by mood from the hero without leaving the page', async () => {
    const user = userEvent.setup();
    routeFetch(suggestions({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/');

    await user.click(screen.getByRole('button', { name: 'Calm' }));
    await user.click(screen.getByRole('button', { name: 'Find films' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/?moods=Calm');
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
  });

  it('redirects the old /discover URL, keeping the moods', async () => {
    routeFetch(suggestions({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/discover?moods=Calm');
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/?moods=Calm');
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    let calls = 0;
    routeFetch({
      '/api/movies/trending': trending,
      '/api/suggestions': () =>
        ++calls === 1 ? json({ error: 'Movie database is not configured' }, 503) : { movies, source: 'ai', moods: ['Sad'] },
    });
    renderAt('/?moods=Sad');

    expect(await screen.findByText('Movie database is not configured')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
  });

  it('explains the AI fallback in the results readout', async () => {
    routeFetch(suggestions({ movies, source: 'fallback', moods: ['Sad'] }));
    renderAt('/?moods=Sad');
    expect(await screen.findByText('2 films for Sad · AI curator unavailable — popular picks')).toBeInTheDocument();
  });

  it('asks for different picks, sending the films already shown', async () => {
    const user = userEvent.setup();
    const more = [{ tmdb_id: 3, title: 'Stalker', year: 1979, rating: 8.1, poster: 'https://image.tmdb.org/s.jpg' }];
    let calls = 0;
    const fetch = routeFetch({
      '/api/movies/trending': trending,
      '/api/suggestions': () => (++calls === 1 ? { movies, source: 'ai', moods: ['Calm'] } : { movies: more, source: 'ai', moods: ['Calm'] }),
    });
    renderAt('/?moods=Calm');

    await screen.findByText('Amélie');
    await user.click(screen.getByRole('button', { name: /Different picks/ }));
    expect(await screen.findByText('Stalker')).toBeInTheDocument();
    expect(JSON.parse(callsTo(fetch, '/api/suggestions')[1][1].body)).toEqual({ moods: ['Calm'], seen_ids: [1, 2] });
  });

  it('opens the shared detail drawer with the reasoning and four actions', async () => {
    const user = userEvent.setup();
    const explained = [{ ...movies[0], why: 'You love whimsical European comedies.', fit: 'Bright and gentle for a calm mood.' }];
    routeFetch(suggestions({ movies: explained, source: 'ai', personalized: true, moods: ['Calm'] }));
    renderAt('/?moods=Calm');

    expect(await screen.findByText(/tuned to your taste/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Amélie (2001), view details' }));
    const drawer = screen.getByRole('dialog', { name: 'Amélie' });
    expect(within(drawer).getByRole('region', { name: 'Why this pick' })).toHaveTextContent('You love whimsical European comedies.');
    for (const action of ['Like', 'Watchlist', 'Seen', 'Not for me']) {
      expect(within(drawer).getByRole('button', { name: action })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('sends signed-out visitors to sign in when they act on a film', async () => {
    const user = userEvent.setup();
    routeFetch({ '/api/movies/trending': trending });
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: 'The Odyssey (2026), view details' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Seen' }));
    // Navigation is a transition; it commits once the lazy page has loaded
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/auth');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
