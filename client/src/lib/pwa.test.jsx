import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { InstallButton, OfflineNotice } from '../components/Shell.jsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PWA', () => {
  it('shows "Install app" only once the browser offers it, and prompts', async () => {
    render(<InstallButton />);
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();

    let prompted = 0;
    const event = new Event('beforeinstallprompt');
    event.prompt = async () => {
      prompted += 1;
    };
    act(() => window.dispatchEvent(event));
    const button = screen.getByRole('button', { name: 'Install app' });
    await act(async () => button.click());
    expect(prompted).toBe(1);
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });

  it('tells the viewer when they go offline', () => {
    render(<OfflineNotice />);
    const online = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent(/offline/);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    act(() => window.dispatchEvent(new Event('online')));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    if (online) delete navigator.onLine;
  });

  it('ships a valid manifest with installable icons', () => {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, '../../public/manifest.webmanifest'), 'utf8'));
    expect(manifest).toMatchObject({ short_name: 'Clinema', display: 'standalone', start_url: expect.stringMatching(/^\//) });
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
  });
});
