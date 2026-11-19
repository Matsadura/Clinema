import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, EmptyState, textLink } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

/** Public, read-only view of someone's watchlist (/w/:shareId). */
export default function SharedWatchlistPage() {
  const { shareId } = useParams();
  const [state, setState] = useState({ status: 'loading', list: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const title = state.list ? `${state.list.owner}’s watchlist` : 'Shared watchlist';
  useDocumentTitle(title);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', list: null, error: null });
    api
      .sharedWatchlist(shareId, { signal: controller.signal })
      .then((list) => setState({ status: 'ready', list, error: null }))
      .catch((err) => err.code !== 'aborted' && setState({ status: err.status === 404 ? 'missing' : 'error', list: null, error: err.message }));
    return () => controller.abort();
  }, [shareId, attempt]);

  const movies = state.list?.movies || [];
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <p className="label">Shared watchlist</p>
      <h1 className="mt-1 font-display text-display text-ink">{title}</h1>
      {state.status === 'ready' && (
        <p className="mt-2 text-muted">
          {movies.length} {movies.length === 1 ? 'film' : 'films'} to watch. Open any film for the trailer and where to stream it.
        </p>
      )}
      <div className="mt-10">
        {state.status === 'loading' && <MovieGridSkeleton count={6} />}
        {state.status === 'error' && (
          <Alert title="Couldn't load this watchlist." onRetry={() => setAttempt((n) => n + 1)}>
            {state.error}
          </Alert>
        )}
        {state.status === 'missing' && (
          <EmptyState title="This list is private or no longer shared." action={<Link to="/" className={textLink}>Find films for your mood</Link>} />
        )}
        {state.status === 'ready' &&
          (movies.length ? (
            <MovieGrid movies={movies} />
          ) : (
            <EmptyState title="Nothing on this watchlist yet." action={<Link to="/" className={textLink}>Find films for your mood</Link>} />
          ))}
      </div>
    </div>
  );
}
