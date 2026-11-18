import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import { api } from '../lib/api.js';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, EmptyState, Skeleton, textLink } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function lifespan({ birthday, deathday, place_of_birth: place }) {
  const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const parts = [];
  if (birthday) parts.push(`Born ${fmt(birthday)}${place ? ` in ${place}` : ''}`);
  if (deathday) parts.push(`died ${fmt(deathday)}`);
  return parts.join(', ');
}

/** A cast or crew member: portrait, short bio and their films. */
export default function PersonPage() {
  const { personId } = useParams();
  const [state, setState] = useState({ status: 'loading', person: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useDocumentTitle(state.person?.name || 'Person');

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', person: null, error: null });
    setExpanded(false);
    api
      .person(personId, { signal: controller.signal })
      .then((person) => setState({ status: 'ready', person, error: null }))
      .catch((err) => err.code !== 'aborted' && setState({ status: err.status === 404 ? 'missing' : 'error', person: null, error: err.message }));
    return () => controller.abort();
  }, [personId, attempt]);

  const { person } = state;
  const bio = person?.biography || '';
  const long = bio.length > 420;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading person">
          <div className="flex gap-6">
            <Skeleton className="aspect-[2/3] w-28 sm:w-40" />
            <div className="flex-1 space-y-3 pt-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-16 w-full max-w-prose" />
            </div>
          </div>
          <div className="mt-12">
            <MovieGridSkeleton count={6} />
          </div>
        </div>
      )}
      {state.status === 'error' && (
        <Alert title="Couldn't load this person." onRetry={() => setAttempt((n) => n + 1)}>
          {state.error}
        </Alert>
      )}
      {state.status === 'missing' && (
        <EmptyState title="We couldn't find that person." action={<Link to="/" className={textLink}>Back to films</Link>} />
      )}
      {person && (
        <>
          <header className="flex flex-col gap-6 sm:flex-row">
            <div className="aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-line/[0.08] sm:w-44">
              {person.photo ? (
                <img src={person.photo} alt={person.name} className="h-full w-full object-cover" />
              ) : (
                <FiUser className="m-auto h-full w-12 text-subtle" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              {person.known_for && <p className="label">{person.known_for === 'Acting' ? 'Actor' : person.known_for}</p>}
              <h1 className="mt-1 font-display text-display text-ink">{person.name}</h1>
              {lifespan(person) && <p className="mt-2 text-sm text-muted">{lifespan(person)}</p>}
              {bio && (
                <div className="mt-5 max-w-prose">
                  <p className={`whitespace-pre-line leading-relaxed text-muted ${long && !expanded ? 'line-clamp-5' : ''}`}>{bio}</p>
                  {long && (
                    <button type="button" onClick={() => setExpanded((v) => !v)} className={`mt-2 text-sm ${textLink}`} aria-expanded={expanded}>
                      {expanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          <section aria-label="Films" className="mt-12">
            <h2 className="mb-6 font-display text-display-sm text-ink">Films</h2>
            {person.movies.length ? (
              <MovieGrid movies={person.movies} />
            ) : (
              <p className="text-muted">No films with posters on TMDB yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
