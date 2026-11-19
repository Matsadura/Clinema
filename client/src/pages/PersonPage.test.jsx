import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { json, routeFetch } from '../test/fetchRoutes.js';

const person = {
  id: 5,
  name: 'Michael Mann',
  photo: null,
  known_for: 'Directing',
  birthday: '1943-02-05',
  deathday: null,
  place_of_birth: 'Chicago, Illinois, USA',
  biography: 'A'.repeat(500),
  movies: [{ tmdb_id: 7, title: 'Heat', year: 1995, rating: 7.9, poster: null, role: 'Director' }],
};

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('PersonPage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the person, a collapsible bio and their films', async () => {
    const user = userEvent.setup();
    routeFetch({ '/api/people/5': person });
    renderAt('/person/5');

    expect(await screen.findByRole('heading', { level: 1, name: 'Michael Mann' })).toBeInTheDocument();
    expect(screen.getByText('Directing')).toBeInTheDocument();
    expect(screen.getByText(/Born .*1943 in Chicago/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Heat' })).toBeInTheDocument();
    expect(document.title).toBe('Michael Mann · Clinema');

    const more = screen.getByRole('button', { name: 'Read more' });
    await user.click(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
  });

  it('handles an unknown person', async () => {
    routeFetch({ '/api/people/9': json({ error: 'Person not found' }, 404) });
    renderAt('/person/9');
    expect(await screen.findByText("We couldn't find that person.")).toBeInTheDocument();
  });
});
