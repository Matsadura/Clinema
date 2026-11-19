import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MovieExtras from './MovieExtras.jsx';
import { callsTo, json, routeFetch } from '../test/fetchRoutes.js';
import { viewerRegion } from '../lib/region.js';

const extras = {
  tmdb_id: 7,
  providers: {
    region: 'MA',
    link: 'https://www.themoviedb.org/movie/7/watch?locale=MA',
    stream: [{ id: 8, name: 'Netflix', logo: 'https://image.tmdb.org/n.jpg' }],
    rent: [],
    buy: [{ id: 2, name: 'Apple TV', logo: null }],
  },
  cast: [{ id: 1, name: 'Al Pacino', character: 'Vincent', photo: null }],
  similar: [{ tmdb_id: 22, title: 'Ronin', year: 1998, poster: 'https://image.tmdb.org/r.jpg' }],
};

const renderExtras = (props) =>
  render(
    <MemoryRouter>
      <MovieExtras tmdbId={7} {...props} />
    </MemoryRouter>,
  );

describe('MovieExtras', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows providers for the viewer’s country, cast links and similar films', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-MA', 'fr']);
    const fetch = routeFetch({ '/api/movies/7/extras': extras });
    const onOpen = vi.fn();
    const onNavigate = vi.fn();
    renderExtras({ onOpen, onNavigate });

    const where = await screen.findByRole('region', { name: 'Where to watch' });
    expect(callsTo(fetch, '/api/movies/7/extras')[0][0]).toBe('/api/movies/7/extras?region=MA');
    expect(within(where).getByText('Where to watch in Morocco')).toBeInTheDocument();
    expect(within(where).getByAltText('Netflix')).toBeInTheDocument();
    expect(within(where).getByText('Apple TV')).toBeInTheDocument(); // no logo: name instead
    expect(within(where).queryByText('Rent')).not.toBeInTheDocument();
    expect(within(where).getByRole('link', { name: /All options/ })).toHaveAttribute('href', extras.providers.link);

    const actor = screen.getByRole('link', { name: /Al Pacino/ });
    expect(actor).toHaveAttribute('href', '/person/1');
    await user.click(actor);
    expect(onNavigate).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ronin (1998)' }));
    expect(onOpen).toHaveBeenCalledWith(extras.similar[0]);
  });

  it('says when a film is not available and hides on errors', async () => {
    routeFetch({ '/api/movies/7/extras': { ...extras, providers: { region: 'US', link: null, stream: [], rent: [], buy: [] }, cast: [], similar: [] } });
    const { unmount } = renderExtras({});
    expect(await screen.findByText(/Not available to stream, rent or buy in United States/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Cast' })).not.toBeInTheDocument();
    unmount();

    routeFetch({ '/api/movies/7/extras': json({ error: 'x' }, 502) });
    const { container } = renderExtras({});
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe('viewerRegion', () => {
  it('uses the first locale with a country, else the US', () => {
    expect(viewerRegion(['en', 'pt-BR'])).toBe('BR');
    expect(viewerRegion(['zh-Hant-TW'])).toBe('TW');
    expect(viewerRegion(['es-419'])).not.toBe('41');
  });
});
