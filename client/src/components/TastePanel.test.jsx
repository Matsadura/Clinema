import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TastePanel from './TastePanel.jsx';

const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
const renderPanel = () =>
  render(
    <MemoryRouter>
      <TastePanel userId="u1" />
    </MemoryRouter>,
  );

describe('TastePanel', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('explains the cold start', async () => {
    fetch.mockResolvedValue(ok({ personalized: false, profile: { interactions: 0 }, summary: '' }));
    renderPanel();
    expect(await screen.findByText(/Nothing learned yet/)).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toBe('/api/u1/taste');
  });

  it('shows learned affinities and constraints', async () => {
    fetch.mockResolvedValue(
      ok({
        personalized: true,
        summary: '...',
        profile: {
          interactions: 7,
          likes: { genres: [['Animation', 4], ['Drama', 2]], directors: [['Hayao Miyazaki', 2]] },
          dislikes: { genres: [['Horror', -2]] },
        },
      }),
    );
    renderPanel();
    expect(await screen.findByText('Animation')).toBeInTheDocument();
    expect(screen.getByText('Hayao Miyazaki')).toBeInTheDocument();
    expect(screen.getByText('Steering away from')).toBeInTheDocument();
    expect(screen.getByText('Horror')).toBeInTheDocument();
    expect(screen.getByText('Based on 7 interactions.')).toBeInTheDocument();
  });
});
