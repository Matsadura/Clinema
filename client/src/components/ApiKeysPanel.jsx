import { useEffect, useState } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiExternalLink, FiKey, FiLock } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { Alert, Button, Skeleton } from './ui.jsx';

function StatusBadge({ entry }) {
  if (entry.configured && entry.status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-green-100">
        <FiCheckCircle aria-hidden="true" /> Your key ••••{entry.last4}
      </span>
    );
  }
  if (entry.configured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-100">
        <FiAlertTriangle aria-hidden="true" /> Key ••••{entry.last4} was rejected
        {entry.fallback_available ? ' — using Clinema’s' : ''}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/70">
      {entry.fallback_available ? 'Using Clinema’s key' : 'Not available — add a key'}
    </span>
  );
}

function KeyRow({ entry, userId, onChange }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(null); // 'save' | 'remove'
  const [error, setError] = useState(null);
  const inputId = `key-${entry.provider}`;
  const showForm = editing || !entry.configured || entry.status !== 'valid';

  const save = async (e) => {
    e.preventDefault();
    setBusy('save');
    setError(null);
    try {
      const updated = await api.saveApiKey(userId, entry.provider, value.trim());
      setValue('');
      setEditing(false);
      onChange(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    setError(null);
    try {
      await api.deleteApiKey(userId, entry.provider);
      setEditing(false);
      onChange({ ...entry, configured: false, last4: null, status: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{entry.label}</h3>
        <StatusBadge entry={entry} />
      </div>

      {showForm ? (
        <form onSubmit={save} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={inputId} className="sr-only">
            {entry.label} API key
          </label>
          <input
            id={inputId}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste your API key"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-secondary-darker px-4 py-2 font-mono text-sm placeholder-white/30 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={busy === 'save'} disabled={value.trim().length < 16}>
              {busy === 'save' ? 'Verifying…' : 'Verify & save'}
            </Button>
            {editing && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a href={entry.docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white/60 hover:text-white">
          Get a key <FiExternalLink aria-hidden="true" />
        </a>
        {entry.configured && !editing && entry.status === 'valid' && (
          <button type="button" onClick={() => setEditing(true)} className="text-white/60 hover:text-white">
            Replace
          </button>
        )}
        {entry.configured && (
          <button type="button" onClick={remove} disabled={busy === 'remove'} className="text-red-300 hover:text-red-200 disabled:opacity-50">
            {busy === 'remove' ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
      {error && (
        <Alert className="mt-3" tone="error">
          {error}
        </Alert>
      )}
    </li>
  );
}

/** Lets signed-in users plug in their own provider keys. Anything they
 *  don't provide (or that stops working) falls back to Clinema's keys. */
export default function ApiKeysPanel({ userId }) {
  const [state, setState] = useState({ status: 'loading', keys: [], error: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .apiKeys(userId, { signal: controller.signal })
      .then((keys) => setState({ status: 'ready', keys, error: null }))
      .catch((err) => err.code !== 'aborted' && setState({ status: 'error', keys: [], error: err.message }));
    return () => controller.abort();
  }, [userId]);

  const update = (entry) =>
    setState((s) => ({ ...s, keys: s.keys.map((k) => (k.provider === entry.provider ? { ...k, ...entry } : k)) }));

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6" aria-labelledby="keys-heading">
      <h2 id="keys-heading" className="flex items-center gap-2 text-lg font-bold">
        <FiKey className="text-primary-light" aria-hidden="true" /> Your API keys
      </h2>
      <p className="mt-1 text-sm text-white/60">
        Optional. Use your own provider keys for your requests (your own quotas and limits). Anything you leave empty
        uses Clinema&apos;s keys.
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
        <FiLock aria-hidden="true" /> Keys are verified with the provider, stored encrypted and never shown again.
      </p>

      {state.status === 'loading' && (
        <div className="mt-5 space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {state.status === 'error' && <Alert className="mt-4">{state.error}</Alert>}
      {state.status === 'ready' && (
        <ul className="mt-5 divide-y divide-white/10">
          {state.keys.map((entry) => (
            <KeyRow key={entry.provider} entry={entry} userId={userId} onChange={update} />
          ))}
        </ul>
      )}
    </section>
  );
}
