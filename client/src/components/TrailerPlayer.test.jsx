import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrailerPlayer from './TrailerPlayer.jsx';
import { callsTo, json, routeFetch } from '../test/fetchRoutes.js';

const videos = [
  { key: 'abc123def45', name: 'Official Trailer', type: 'Trailer', official: true },
  { key: 'xyz987uvw65', name: 'Final Trailer', type: 'Trailer', official: true },
  { key: 'tease000001', name: 'Teaser', type: 'Teaser', official: true },
];

describe('TrailerPlayer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the player only on play, then switches videos in place', async () => {
    const user = userEvent.setup();
    const fetch = routeFetch({ '/api/movies/7/trailers': videos });
    render(<TrailerPlayer tmdbId={7} title="Heat" backdrop="https://image.tmdb.org/b.jpg" />);

    const play = await screen.findByRole('button', { name: 'Play trailer: Heat' });
    expect(callsTo(fetch, '/api/movies/7/trailers')).toHaveLength(1);
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getAllByRole('button', { pressed: false }).map((b) => b.textContent)).toEqual(['Trailer 2', 'Teaser']);

    await user.click(play);
    const frame = screen.getByTitle('Heat: Official Trailer');
    expect(frame.getAttribute('src')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/abc123def45\?autoplay=1/);

    await user.click(screen.getByRole('button', { name: 'Teaser' }));
    expect(screen.getByTitle('Heat: Teaser').getAttribute('src')).toContain('/embed/tease000001');
  });

  it('renders nothing when there is no trailer or TMDB fails', async () => {
    routeFetch({ '/api/movies/1/trailers': [], '/api/movies/2/trailers': json({ error: 'x' }, 502) });
    const { container, rerender } = render(<TrailerPlayer key={1} tmdbId={1} title="A" />);
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    rerender(<TrailerPlayer key={2} tmdbId={2} title="B" />);
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole('button')).toBeNull();
  });
});
