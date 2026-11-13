import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import cover from '../images/auth-cover.webp';
import logo from '../images/brand-logo-light.svg';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Button } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const inputClass =
  'mt-1 block w-full rounded-xl border border-white/10 bg-secondary-darker px-4 py-2.5 text-sm placeholder-white/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40';

function Field({ label, id, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-white/90">
        {label}
      </label>
      <input id={id} name={id} className={inputClass} {...props} />
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

  return (
    <div className="grid min-h-[calc(100vh-4rem)] md:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <img src={logo} alt="" className="h-10 w-auto" width="150" height="40" />
          <h1 className="mt-8 text-3xl font-extrabold">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-2 text-sm text-white/60">
            {location.state?.reason === 'library'
              ? 'Sign in to like films and build your watchlist.'
              : mode === 'signup'
                ? 'Save the films you love and build a watchlist.'
                : 'Sign in to see your liked films and watchlist.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate={false}>
            {error && <Alert>{error}</Alert>}
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" id="first_name" autoComplete="given-name" required maxLength={128} value={form.first_name} onChange={update('first_name')} />
                <Field label="Last name" id="last_name" autoComplete="family-name" required maxLength={128} value={form.last_name} onChange={update('last_name')} />
              </div>
            )}
            <Field label="Email" id="email" type="email" autoComplete="email" required placeholder="you@example.com" value={form.email} onChange={update('email')} />
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
            <Button type="submit" className="w-full" loading={submitting}>
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-white/60">
            {mode === 'signup' ? 'Already have an account?' : 'New to Clinema?'}{' '}
            <button type="button" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="font-semibold text-primary-light hover:underline">
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <p className="mt-2 text-sm">
            <Link to="/" className="text-white/50 hover:text-white">
              ← Keep browsing without an account
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden md:block">
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" width="1200" height="1200" />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-dark via-secondary-dark/20 to-transparent" />
      </div>
    </div>
  );
}
