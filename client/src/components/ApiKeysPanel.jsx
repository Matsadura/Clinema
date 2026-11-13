import { useEffect, useState } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { Alert, Button, Skeleton } from './ui.jsx';

/** Plain-text status: colour carries meaning, no pill or icon. */
function Status({ entry }) {
  if (entry.configured && entry.status === 'valid') {
    return <span className="text-like">Your key ••••{entry.last4}</span>;
  }
  if (entry.configured) {
    return (
      <span className="text-dislike">
        Key ••••{entry.last4} was rejected{entry.fallback_available ? ' — using Clinema’s' : ''}
      </span>
    );
  }
  return <span className="text-subtle">{entry.fallback_available ? 'Using Clinema’s key' : 'Not available — add a key'}</span>;
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
    <li className="border-b border-line/[0.06] py-4 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-medium text-ink">{entry.label}</h3>
        <p className="num text-sm">
          <Status entry={entry} />
        </p>
      </div>

      {showForm && (
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
            className="field h-9 min-w-0 flex-1 font-mono"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" loading={busy === 'save'} disabled={value.trim().length < 16} className="h-9">
              {busy === 'save' ? 'Verifying…' : 'Verify & save'}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" className="h-9" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a href={entry.docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-subtle transition-colors hover:text-ink">
          Get a key <FiExternalLink aria-hidden="true" />
        </a>
        {entry.configured && !editing && entry.status === 'valid' && (
          <button type="button" onClick={() => setEditing(true)} className="text-subtle transition-colors hover:text-ink">
            Replace
          </button>
        )}
        {entry.configured && (
          <button type="button" onClick={remove} disabled={busy === 'remove'} className="text-dislike transition-colors hover:text-ink disabled:opacity-50">
            {busy === 'remove' ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>
      {error && <Alert className="mt-3">{error}</Alert>}
    </li>
  );
}

/** Optional per-user provider keys. Anything not provided (or rejected)
 *  falls back to Clinema's keys. */
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

  if (state.status === 'loading') {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (state.status === 'error') return <Alert>{state.error}</Alert>;
  return (
    <ul>
      {state.keys.map((entry) => (
        <KeyRow key={entry.provider} entry={entry} userId={userId} onChange={update} />
      ))}
    </ul>
  );
}
