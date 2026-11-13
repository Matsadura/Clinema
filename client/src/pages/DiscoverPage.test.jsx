import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

const movies = [
  { tmdb_id: 1, title: 'Amélie', year: 2001, rating: 7.9, poster: 'https://image.tmdb.org/a.jpg' },
  { tmdb_id: 2, title: 'Paddington', year: 2014, rating: 7.2, poster: 'https://image.tmdb.org/p.jpg' },
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

const ok = (body) => new Response(JSON.stringify(body), { status: 200 });

describe('Discover (home)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads recommendations for the moods in the URL, with poster skeletons first', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/?moods=Calm,Bogus');

    expect(screen.getByLabelText('Loading movies')).toBeInTheDocument();
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
    expect(screen.getByText('2 films')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ moods: ['Calm'] });
  });

  it('searches from the control bar without leaving the page', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue(ok({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/');

    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Calm' }));
    await user.click(screen.getByRole('button', { name: 'Find films' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/?moods=Calm');
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
  });

  it('redirects the old /discover URL to the home page, keeping the moods', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/discover?moods=Calm&weather=1');
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/?moods=Calm&weather=1');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ moods: ['Calm'] });
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Movie database is not configured' }), { status: 503 }))
      .mockResolvedValueOnce(ok({ movies, source: 'ai', moods: ['Sad'] }));
    renderAt('/?moods=Sad');

    expect(await screen.findByText('Movie database is not configured')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
  });

  it('explains the AI fallback in the single results readout', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'fallback', moods: ['Sad'] }));
    renderAt('/?moods=Sad');
    expect(await screen.findByText('2 films · AI curator unavailable — popular picks')).toBeInTheDocument();
  });

  it('remembers shown films and asks for different ones', async () => {
    const user = userEvent.setup();
    const more = [{ tmdb_id: 3, title: 'Stalker', year: 1979, rating: 8.1, poster: 'https://image.tmdb.org/s.jpg' }];
    fetch
      .mockResolvedValueOnce(ok({ movies, source: 'ai', moods: ['Calm'] }))
      .mockResolvedValueOnce(ok({ movies: more, source: 'ai', moods: ['Calm'] }));
    renderAt('/?moods=Calm');

    await screen.findByText('Amélie');
    await user.click(screen.getByRole('button', { name: /Different picks/ }));
    expect(await screen.findByText('Stalker')).toBeInTheDocument();
    expect(screen.queryByText('Amélie')).not.toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ moods: ['Calm'], seen_ids: [1, 2] });
    expect(JSON.parse(window.localStorage.getItem('clinema:seen'))).toEqual([1, 2, 3]);
  });

  it('opens the detail drawer with the personalised reasoning', async () => {
    const user = userEvent.setup();
    const explained = [{ ...movies[0], why: 'You love whimsical European comedies.', fit: 'Bright and gentle for a calm mood.', genres: ['Comedy'] }];
    fetch.mockResolvedValue(ok({ movies: explained, source: 'ai', personalized: true, moods: ['Calm'] }));
    renderAt('/?moods=Calm');

    expect(await screen.findByText(/tuned to your taste/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Amélie (2001), view details' }));
    const drawer = screen.getByRole('dialog', { name: 'Amélie' });
    const why = within(drawer).getByRole('region', { name: 'Why this pick' });
    expect(why).toHaveTextContent('You love whimsical European comedies.');
    expect(why).toHaveTextContent('Bright and gentle for a calm mood.');
    expect(within(drawer).getByRole('button', { name: 'Like' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows only the control bar when no mood is chosen', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What do you want to feel tonight?');
    expect(screen.queryByRole('region', { name: 'Recommendations' })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
