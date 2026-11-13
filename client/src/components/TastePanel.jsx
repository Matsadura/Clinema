import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Alert, Skeleton, textLink } from './ui.jsx';

const LABELS = {
  genres: 'Genres',
  directors: 'Directors',
  keywords: 'Themes',
  eras: 'Eras',
  languages: 'Languages',
  countries: 'Countries',
  tones: 'Tone',
};

/** Values strongest-first; the strongest reads in full ink, the rest muted. */
function Values({ entries, negative = false }) {
  return (
    <dd className="text-sm">
      {entries.map(([name, score], i) => (
        <span key={name} title={`Weight ${score > 0 ? '+' : ''}${score}`}>
          <span className={negative ? 'text-dislike' : i === 0 ? 'text-ink' : 'text-muted'}>{name}</span>
          {i < entries.length - 1 && <span className="text-subtle">, </span>}
        </span>
      ))}
    </dd>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-line/[0.06] py-3 sm:grid-cols-[120px_1fr] sm:gap-4">
      <dt className="text-sm text-subtle">{label}</dt>
      {children}
    </div>
  );
}

/** What Clinema has learned from likes, dismissals and browsing: the same
 *  profile that is summarised into AI prompts. */
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

  if (state.status === 'loading') {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    );
  }
  if (state.status === 'error') return <Alert>{state.error}</Alert>;

  const { profile, personalized } = state.data;
  if (!personalized) {
    return (
      <p className="max-w-prose text-sm text-muted">
        Nothing learned yet. <Link to="/" className={textLink}>Get some picks</Link> and like or dismiss a few — your
        profile appears here.
      </p>
    );
  }

  const dislikes = Object.values(profile.dislikes || {}).flat();
  return (
    <div>
      <dl className="border-t border-line/[0.06]">
        {Object.keys(LABELS)
          .filter((kind) => profile.likes?.[kind]?.length)
          .map((kind) => (
            <Row key={kind} label={LABELS[kind]}>
              <Values entries={profile.likes[kind]} />
            </Row>
          ))}
        {dislikes.length > 0 && (
          <Row label="Steering away from">
            <Values entries={dislikes} negative />
          </Row>
        )}
      </dl>
      <p className="num mt-3 text-xs text-subtle">Based on {profile.interactions} interactions.</p>
    </div>
  );
}
