import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DiscoverPage from './DiscoverPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

const movies = [
  { tmdb_id: 1, title: 'Amélie', year: 2001, rating: 7.9, poster: 'https://image.tmdb.org/a.jpg' },
  { tmdb_id: 2, title: 'Paddington', year: 2014, rating: 7.2, poster: 'https://image.tmdb.org/p.jpg' },
];

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <Routes>
          <Route path="/discover" element={<DiscoverPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const ok = (body) => new Response(JSON.stringify(body), { status: 200 });

describe('DiscoverPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads recommendations for the moods in the URL', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/discover?moods=Calm,Bogus');

    expect(screen.getByLabelText('Loading movies')).toBeInTheDocument();
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
    expect(screen.getByText('Paddington')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ moods: ['Calm'] });
  });

  it('explains when the AI fallback was used', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'fallback', moods: ['Sad'] }));
    renderAt('/discover?moods=Sad');
    expect(await screen.findByText(/AI curator is unavailable/)).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Movie database is not configured' }), { status: 503 }))
      .mockResolvedValueOnce(ok({ movies, source: 'ai', moods: ['Sad'] }));
    renderAt('/discover?moods=Sad');

    expect(await screen.findByText('Movie database is not configured')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
  });

  it('remembers shown films and asks for different ones on refresh', async () => {
    const user = userEvent.setup();
    const more = [{ tmdb_id: 3, title: 'Stalker', year: 1979, rating: 8.1, poster: 'https://image.tmdb.org/s.jpg' }];
    fetch
      .mockResolvedValueOnce(ok({ movies, source: 'ai', moods: ['Calm'] }))
      .mockResolvedValueOnce(ok({ movies: more, source: 'ai', moods: ['Calm'] }));
    renderAt('/discover?moods=Calm');

    await screen.findByText('Amélie');
    await user.click(screen.getByRole('button', { name: /Show different picks/ }));
    expect(await screen.findByText('Stalker')).toBeInTheDocument();
    expect(screen.queryByText('Amélie')).not.toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ moods: ['Calm'], seen_ids: [1, 2] });
    expect(JSON.parse(window.localStorage.getItem('clinema:seen'))).toEqual([1, 2, 3]);
  });

  it('shows the personalised badge and the AI explanation', async () => {
    const user = userEvent.setup();
    const explained = [{ ...movies[0], why: 'You love whimsical European comedies.', fit: 'Bright and gentle for a calm mood.', genres: ['Comedy'] }];
    fetch.mockResolvedValue(ok({ movies: explained, source: 'ai', personalized: true, moods: ['Calm'] }));
    renderAt('/discover?moods=Calm');

    expect(await screen.findByText('Personalised for you')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Amélie \(2001\)/ }));
    const why = screen.getByRole('region', { name: 'Why this pick' });
    expect(why).toHaveTextContent('You love whimsical European comedies.');
    expect(why).toHaveTextContent('Bright and gentle for a calm mood.');
  });

  it('ignores the legacy weather parameter', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'ai', moods: ['Calm'] }));
    renderAt('/discover?moods=Calm&weather=1');
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ moods: ['Calm'] });
  });

  it('shows an empty state when nothing was requested', () => {
    renderAt('/discover');
    expect(screen.getByText('Nothing to match yet')).toBeInTheDocument();
  });
});
