import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { resetFeaturesCache } from '../hooks/useFeatures.js';
import { callsTo, json, routeFetch } from '../test/fetchRoutes.js';

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('Password reset', () => {
  beforeEach(() => resetFeaturesCache());
  afterEach(() => vi.unstubAllGlobals());

  it('offers "Forgot password?" only when the server can send email', async () => {
    routeFetch({ '/api/features': { password_reset: false } });
    const { unmount } = renderAt('/auth');
    await screen.findByRole('heading', { name: 'Sign in' });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('link', { name: 'Forgot password?' })).not.toBeInTheDocument();
    unmount();

    resetFeaturesCache();
    routeFetch({ '/api/features': { password_reset: true } });
    renderAt('/auth');
    expect(await screen.findByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  });

  it('requests a reset link', async () => {
    const u = userEvent.setup();
    const fetch = routeFetch({ '/api/password/forgot': json({ message: 'If an account exists, a link is on its way.' }, 202) });
    renderAt('/forgot-password');
    await u.type(await screen.findByLabelText('Email'), ' ada@example.com ');
    await u.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(JSON.parse(callsTo(fetch, '/api/password/forgot')[0][1].body)).toEqual({ email: 'ada@example.com' });
  });

  it('sets a new password from the emailed link', async () => {
    const u = userEvent.setup();
    const fetch = routeFetch({ '/api/password/reset': { message: 'Password updated. You can sign in now.' } });
    renderAt('/reset-password?token=tok123');
    await u.type(await screen.findByLabelText('New password'), 'brand-new-pass');
    await u.type(screen.getByLabelText('Confirm password'), 'brand-new-pass');
    await u.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
    expect(JSON.parse(callsTo(fetch, '/api/password/reset')[0][1].body)).toEqual({ token: 'tok123', password: 'brand-new-pass' });
  });

  it('checks the passwords match and explains expired links', async () => {
    const u = userEvent.setup();
    routeFetch({ '/api/password/reset': json({ error: 'This reset link is invalid or has expired. Request a new one.' }, 400) });
    renderAt('/reset-password?token=old');
    await u.type(await screen.findByLabelText('New password'), 'brand-new-pass');
    await u.type(screen.getByLabelText('Confirm password'), 'different-pass');
    await u.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();

    await u.clear(screen.getByLabelText('Confirm password'));
    await u.type(screen.getByLabelText('Confirm password'), 'brand-new-pass');
    await u.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });

  it('handles a link without a token', async () => {
    routeFetch({});
    renderAt('/reset-password');
    expect(await screen.findByRole('heading', { name: 'Link incomplete' })).toBeInTheDocument();
  });
});
