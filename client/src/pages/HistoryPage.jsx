import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMovieDrawer } from '../context/MovieDrawerContext.jsx';
import { Rating, PosterFallback } from '../components/MovieCard.jsx';
import { Alert, EmptyState, Skeleton, textLink } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const EVENT_LABELS = {
  like: { text: 'Liked', tone: 'text-like' },
  dislike: { text: 'Not for you', tone: 'text-dislike' },
  seen: { text: 'Seen', tone: 'text-ink' },
  save: { text: 'Added to watchlist', tone: 'text-accent' },
  view: { text: 'Opened', tone: 'text-muted' },
  recommended: { text: 'Recommended', tone: 'text-muted' },
};
// Most meaningful first when describing a film's activity
const PRIORITY = ['like', 'dislike', 'seen', 'save', 'view', 'recommended'];

function dayLabel(date) {
  const today = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: diff > 300 ? 'numeric' : undefined });
}

function Row({ entry }) {
  const { open } = useMovieDrawer();
  const movie = entry.movie || { tmdb_id: entry.movie_id, title: `Movie #${entry.movie_id}` };
  const events = PRIORITY.filter((e) => entry.events.includes(e));
  const main = EVENT_LABELS[events[0]] || EVENT_LABELS.recommended;
  const time = new Date(entry.last_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <li>
      <button
        type="button"
        onClick={() => open(movie)}
        className="flex w-full items-center gap-4 rounded-md px-2 py-3 text-left transition-colors duration-150 hover:bg-surface"
      >
        <span className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-sm ring-1 ring-line/[0.08]">
          {movie.poster ? <img src={movie.poster} alt="" loading="lazy" className="h-full w-full object-cover" /> : <PosterFallback title="" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink">{movie.title}</span>
          <span className="num mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
            {movie.year && <span>{movie.year}</span>}
            <Rating value={movie.rating} />
          </span>
          {entry.moods.length > 0 && (
            <span className="mt-1 block truncate text-xs text-subtle">For {entry.moods.join(', ')}</span>
          )}
        </span>
        <span className="shrink-0 text-right text-sm">
          <span className={`block ${main.tone}`}>{main.text}</span>
          <span className="num block text-xs text-subtle">{time}</span>
        </span>
      </button>
    </li>
  );
}

export default function HistoryPage() {
  useDocumentTitle('History');
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', entries: [], error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    api
      .history(user.id, { signal: controller.signal })
      .then((entries) => setState({ status: 'ready', entries, error: null }))
      .catch((err) => err.code !== 'aborted' && setState({ status: 'error', entries: [], error: err.message }));
    return () => controller.abort();
  }, [user.id, attempt]);

  const groups = [];
  for (const entry of state.entries) {
    const label = dayLabel(new Date(entry.last_at));
    if (groups.at(-1)?.label !== label) groups.push({ label, entries: [] });
    groups.at(-1).entries.push(entry);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-display text-ink">History</h1>
      <p className="mt-2 text-muted">Films you&apos;ve been shown, opened or reacted to — the signals behind your taste profile.</p>

      <div className="mt-10">
        {state.status === 'loading' && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading history">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <Alert title="Couldn't load your history." onRetry={() => setAttempt((n) => n + 1)}>
            {state.error}
          </Alert>
        )}
        {state.status === 'ready' && !groups.length && (
          <EmptyState
            title="Nothing here yet."
            action={
              <Link to="/" className={textLink}>
                Find something to watch
              </Link>
            }
          >
            Pick a mood and your recommendations, likes and views will appear here.
          </EmptyState>
        )}
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label} className="mb-8">
            <h2 className="label mb-2 border-b border-line/[0.08] pb-2">{group.label}</h2>
            <ul>
              {group.entries.map((entry) => (
                <Row key={entry.movie_id} entry={entry} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
