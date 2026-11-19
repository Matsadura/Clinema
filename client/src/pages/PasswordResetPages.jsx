import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Alert, Button, Field, textLink } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function Panel({ title, intro, children }) {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10 sm:py-16">
      <h1 className="font-display text-display text-ink">{title}</h1>
      {intro && <p className="mt-3 text-sm text-muted">{intro}</p>}
      {children}
      <p className="mt-8 text-sm">
        <Link to="/auth" className="text-subtle transition-colors hover:text-ink">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

/** /forgot-password: request a reset link by email. */
export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [state, setState] = useState({ status: 'idle', message: null });

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'sending', message: null });
    try {
      const res = await api.forgotPassword(email.trim());
      setState({ status: 'sent', message: res.message });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  };

  if (state.status === 'sent') {
    return (
      <Panel title="Check your email" intro={state.message}>
        <p className="mt-6 text-sm text-muted">Nothing after a few minutes? Check your spam folder, or try again.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Forgot your password?" intro="Enter your account’s email and we’ll send you a link to choose a new one.">
      <form onSubmit={submit} className="mt-10 space-y-6">
        {state.status === 'error' && <Alert>{state.message}</Alert>}
        <Field label="Email" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" loading={state.status === 'sending'}>
          Send reset link
        </Button>
      </form>
    </Panel>
  );
}

/** /reset-password?token=...: choose a new password. */
export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [state, setState] = useState({ status: 'idle', message: null });

  // Keep the one-time token out of the address bar and history
  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', '/reset-password');
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setState({ status: 'error', message: 'Password must be at least 8 characters.' });
    if (form.password !== form.confirm) return setState({ status: 'error', message: "Passwords don't match." });
    setState({ status: 'saving', message: null });
    try {
      const res = await api.resetPassword(token, form.password);
      setState({ status: 'done', message: res.message });
    } catch (err) {
      setState({ status: 'error', message: err.message });
      setForm({ password: '', confirm: '' });
    }
  };

  if (!token) {
    return (
      <Panel title="Link incomplete" intro="This reset link is missing its code. Open the link from the email again, or request a new one.">
        <p className="mt-6 text-sm">
          <Link to="/forgot-password" className={textLink}>
            Request a new link
          </Link>
        </p>
      </Panel>
    );
  }
  if (state.status === 'done') {
    return (
      <Panel title="Password updated" intro={`${state.message} Other devices have been signed out.`}>
        <Link to="/auth" className="mt-8 flex h-12 items-center justify-center rounded-md bg-accent font-medium text-accent-ink hover:bg-accent-strong">
          Sign in
        </Link>
      </Panel>
    );
  }
  return (
    <Panel title="Choose a new password">
      <form onSubmit={submit} className="mt-10 space-y-6">
        {state.status === 'error' && (
          <Alert>
            {state.message}{' '}
            {/expired|invalid/i.test(state.message || '') && (
              <Link to="/forgot-password" className={textLink}>
                Request a new link
              </Link>
            )}
          </Alert>
        )}
        <Field
          label="New password"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <Field
          label="Confirm password"
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
        />
        <Button type="submit" size="lg" className="w-full" loading={state.status === 'saving'}>
          Save new password
        </Button>
      </form>
    </Panel>
  );
}
