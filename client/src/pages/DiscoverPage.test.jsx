import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DiscoverPage from './DiscoverPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { LocationProvider } from '../context/LocationContext.jsx';

const movies = [
  { tmdb_id: 1, title: 'Amélie', year: 2001, rating: 7.9, poster: 'https://image.tmdb.org/a.jpg' },
  { tmdb_id: 2, title: 'Paddington', year: 2014, rating: 7.2, poster: 'https://image.tmdb.org/p.jpg' },
];

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <LocationProvider>
          <Routes>
            <Route path="/discover" element={<DiscoverPage />} />
          </Routes>
        </LocationProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const ok = (body) => new Response(JSON.stringify(body), { status: 200 });

describe('DiscoverPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    window.sessionStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads recommendations for the moods in the URL', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'ai', moods: ['Calm'], weather: null, warning: null }));
    renderAt('/discover?moods=Calm,Bogus');

    expect(screen.getByLabelText('Loading movies')).toBeInTheDocument();
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
    expect(screen.getByText('Paddington')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ moods: ['Calm'] });
  });

  it('explains when the AI fallback was used', async () => {
    fetch.mockResolvedValue(ok({ movies, source: 'fallback', moods: ['Sad'], weather: null, warning: null }));
    renderAt('/discover?moods=Sad');
    expect(await screen.findByText(/AI curator is unavailable/)).toBeInTheDocument();
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Movie database is not configured' }), { status: 503 }))
      .mockResolvedValueOnce(ok({ movies, source: 'ai', moods: ['Sad'], weather: null, warning: null }));
    renderAt('/discover?moods=Sad');

    expect(await screen.findByText('Movie database is not configured')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText('Amélie')).toBeInTheDocument();
  });

  it('asks for location before weather-based picks', async () => {
    renderAt('/discover?moods=Calm&weather=1');
    expect(screen.getByRole('heading', { name: 'Share your location' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows an empty state when nothing was requested', () => {
    renderAt('/discover');
    expect(screen.getByText('Nothing to match yet')).toBeInTheDocument();
  });
});
