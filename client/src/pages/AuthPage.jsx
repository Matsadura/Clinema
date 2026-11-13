import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Button, textLink } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function Field({ label, id, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-muted">
        {label}
      </label>
      <input id={id} name={id} className="field h-10" {...props} />
    </div>
  );
}

export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  useDocumentTitle(mode === 'signup' ? 'Create account' : 'Sign in');

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const switchMode = (next) => {
    setError(null);
    setParams(next === 'signup' ? { mode: 'signup' } : {}, { replace: true, state: location.state });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup') {
      if (form.password.length < 8) return setError('Password must be at least 8 characters.');
      if (form.password !== form.confirm) return setError("Passwords don't match.");
    }
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await register({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      } else {
        await login(form.email.trim(), form.password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Incorrect email or password.' : err.message);
      setForm((f) => ({ ...f, password: '', confirm: '' }));
    } finally {
      setSubmitting(false);
    }
  };

  const intro =
    location.state?.reason === 'library'
      ? 'Sign in to like films and keep a watchlist.'
      : mode === 'signup'
        ? 'Your likes and dismissals teach Clinema your taste.'
        : 'Pick up where your taste left off.';

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-10 sm:py-16">
      <h1 className="font-display text-display text-ink">{mode === 'signup' ? 'Create an account' : 'Sign in'}</h1>
      <p className="mt-3 text-sm text-muted">{intro}</p>

      <form onSubmit={submit} className="mt-10 space-y-6">
        {error && <Alert>{error}</Alert>}
        {mode === 'signup' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" id="first_name" autoComplete="given-name" required maxLength={128} value={form.first_name} onChange={update('first_name')} />
            <Field label="Last name" id="last_name" autoComplete="family-name" required maxLength={128} value={form.last_name} onChange={update('last_name')} />
          </div>
        )}
        <Field label="Email" id="email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        <Field
          label="Password"
          id="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={mode === 'signup' ? 8 : undefined}
          placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
          value={form.password}
          onChange={update('password')}
        />
        {mode === 'signup' && (
          <Field label="Confirm password" id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={update('confirm')} />
        )}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted">
        {mode === 'signup' ? 'Already have an account? ' : 'New to Clinema? '}
        <button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className={textLink}>
          {mode === 'signup' ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      <p className="mt-3 text-sm">
        <Link to="/" className="text-subtle transition-colors hover:text-ink">
          Continue without an account
        </Link>
      </p>
    </div>
  );
}
