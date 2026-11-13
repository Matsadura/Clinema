import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { Alert, Skeleton } from './ui.jsx';

const LABELS = {
  genres: 'Genres',
  directors: 'Directors',
  keywords: 'Themes',
  eras: 'Eras',
  languages: 'Languages',
  countries: 'Countries',
  tones: 'Tone',
};

function Chips({ entries, tone }) {
  const max = Math.max(...entries.map(([, score]) => Math.abs(score)), 1);
  const styles = tone === 'negative' ? 'bg-red-500/10 text-red-100' : 'bg-primary/15 text-green-100';
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map(([name, score]) => (
        <li
          key={name}
          className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}
          style={{ opacity: 0.55 + 0.45 * (Math.abs(score) / max) }}
          title={`Weight ${score > 0 ? '+' : ''}${score}`}
        >
          {name}
        </li>
      ))}
    </ul>
  );
}

/** Shows what Clinema has learned from the user's likes, dislikes and
 *  browsing — the same profile that is summarised into AI prompts. */
export default function TastePanel({ userId }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .taste(userId, { signal: controller.signal })
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((err) => err.code !== 'aborted' && setState({ status: 'error', data: null, error: err.message }));
    return () => controller.abort();
  }, [userId]);

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6" aria-labelledby="taste-heading">
      <h2 id="taste-heading" className="flex items-center gap-2 text-lg font-bold">
        <FiTrendingUp className="text-primary-light" aria-hidden="true" /> Your taste
      </h2>
      <p className="mt-1 text-sm text-white/60">
        Learned from the films you like, dismiss and open. It shapes every recommendation.
      </p>

      {state.status === 'loading' && (
        <div className="mt-4 space-y-2" aria-busy="true">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      )}
      {state.status === 'error' && <Alert className="mt-4">{state.error}</Alert>}
      {state.status === 'ready' && !state.data.personalized && (
        <p className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60">
          Nothing learned yet. <Link to="/#mood" className="font-semibold text-primary-light hover:underline">Get some picks</Link>{' '}
          and tap ❤️ or 👎 on a few — your profile appears here.
        </p>
      )}
      {state.status === 'ready' && state.data.personalized && (
        <div className="mt-5 space-y-5">
          {Object.entries(state.data.profile.likes || {}).map(([kind, entries]) => (
            <div key={kind}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">{LABELS[kind] || kind}</h3>
              <Chips entries={entries} />
            </div>
          ))}
          {Object.keys(state.data.profile.dislikes || {}).length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Steering away from</h3>
              <Chips entries={Object.values(state.data.profile.dislikes).flat()} tone="negative" />
            </div>
          )}
          <p className="text-xs text-white/40">Based on {state.data.profile.interactions} interactions.</p>
        </div>
      )}
    </section>
  );
}
