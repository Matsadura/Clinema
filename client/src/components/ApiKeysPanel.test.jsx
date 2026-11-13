import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeysPanel from './ApiKeysPanel.jsx';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const entry = (provider, label, extra = {}) => ({
  provider,
  label,
  docs_url: `https://example.com/${provider}`,
  configured: false,
  last4: null,
  status: null,
  fallback_available: true,
  ...extra,
});
const KEYS = [
  entry('groq', 'Groq (AI recommendations)'),
  entry('tmdb', 'TMDB (movie data & posters)', { configured: true, last4: 'ab12', status: 'valid' }),
];
const row = (name) => screen.getByRole('heading', { name }).closest('li');

describe('ApiKeysPanel', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('shows which key each provider uses', async () => {
    fetch.mockResolvedValue(json(KEYS));
    render(<ApiKeysPanel userId="u1" />);
    expect(await screen.findByText('Using Clinema’s key')).toBeInTheDocument();
    expect(screen.getByText(/Your key ••••ab12/)).toBeInTheDocument();
  });

  it('flags a key the provider rejected', async () => {
    fetch.mockResolvedValue(json([{ ...KEYS[0], configured: true, last4: 'zz99', status: 'invalid' }, KEYS[1]]));
    render(<ApiKeysPanel userId="u1" />);
    expect(await screen.findByText(/••••zz99 was rejected — using Clinema’s/)).toBeInTheDocument();
  });

  it('verifies and saves a key, then masks it', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce(json(KEYS))
      .mockResolvedValueOnce(json({ ...KEYS[0], configured: true, last4: 'wxyz', status: 'valid' }));
    render(<ApiKeysPanel userId="u1" />);
    await screen.findByText('Groq (AI recommendations)');
    const groq = row('Groq (AI recommendations)');

    const input = within(groq).getByLabelText(/Groq .* API key/);
    expect(input).toHaveAttribute('type', 'password');
    await user.type(input, 'gsk_abcdefghijklmnopqrstuvwxyz');
    await user.click(within(groq).getByRole('button', { name: 'Verify & save' }));

    expect(await within(groq).findByText(/Your key ••••wxyz/)).toBeInTheDocument();
    expect(within(groq).queryByLabelText(/API key/)).not.toBeInTheDocument();
    const [url, init] = fetch.mock.calls[1];
    expect(url).toBe('/api/u1/api-keys/groq');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ key: 'gsk_abcdefghijklmnopqrstuvwxyz' });
  });

  it('shows the provider error when a key is rejected', async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce(json(KEYS))
      .mockResolvedValueOnce(json({ error: 'Groq rejected this key.' }, 400));
    render(<ApiKeysPanel userId="u1" />);
    await screen.findByText('Groq (AI recommendations)');
    const groq = row('Groq (AI recommendations)');
    await user.type(within(groq).getByLabelText(/API key/), 'gsk_badbadbadbadbadbad');
    await user.click(within(groq).getByRole('button', { name: 'Verify & save' }));
    expect(await within(groq).findByRole('alert')).toHaveTextContent('Groq rejected this key.');
  });

  it('removes a key and falls back to Clinema’s', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce(json(KEYS)).mockResolvedValueOnce(json({ provider: 'tmdb', configured: false }));
    render(<ApiKeysPanel userId="u1" />);
    await screen.findByText('TMDB (movie data & posters)');
    const tmdb = row('TMDB (movie data & posters)');
    await user.click(within(tmdb).getByRole('button', { name: 'Remove' }));
    expect(await within(tmdb).findByText('Using Clinema’s key')).toBeInTheDocument();
    expect(fetch.mock.calls[1][1].method).toBe('DELETE');
  });
});
