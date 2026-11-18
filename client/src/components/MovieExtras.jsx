import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiExternalLink, FiUser } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { regionName, viewerRegion } from '../lib/region.js';
import { PosterFallback } from './MovieCard.jsx';
import { Skeleton } from './ui.jsx';

const GROUPS = [
  ['stream', 'Stream'],
  ['rent', 'Rent'],
  ['buy', 'Buy'],
];

function Heading({ children }) {
  return <h3 className="label mb-3">{children}</h3>;
}

function WhereToWatch({ providers }) {
  const groups = GROUPS.filter(([key]) => Array.isArray(providers[key]) && providers[key].length);
  const country = regionName(providers.region);
  return (
    <section aria-label="Where to watch" className="mt-8">
      <Heading>Where to watch in {country}</Heading>
      {groups.length ? (
        <dl className="space-y-3">
          {groups.map(([key, label]) => (
            <div key={key} className="flex items-center gap-4">
              <dt className="w-14 shrink-0 text-sm text-subtle">{label}</dt>
              <dd className="flex flex-wrap gap-2">
                {providers[key].map((p) => (
                  <span key={p.id} title={p.name} className="block h-10 w-10 overflow-hidden rounded-md ring-1 ring-line/[0.08]">
                    {p.logo ? (
                      <img src={p.logo} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-surface-hover text-[10px] text-muted">{p.name}</span>
                    )}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted">Not available to stream, rent or buy in {country} right now.</p>
      )}
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        <span>Availability from JustWatch</span>
        {providers.link && (
          <a href={providers.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-ink">
            All options <FiExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </p>
    </section>
  );
}

function Cast({ cast, onNavigate }) {
  return (
    <section aria-label="Cast" className="mt-8">
      <Heading>Cast</Heading>
      <ul className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cast.map((person) => (
          <li key={person.id} className="w-20 shrink-0">
            <Link to={`/person/${person.id}`} onClick={onNavigate} className="group block text-center">
              <span className="mx-auto block h-20 w-20 overflow-hidden rounded-full bg-surface-hover ring-1 ring-line/[0.08] transition group-hover:ring-accent/60">
                {person.photo ? (
                  <img src={person.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <FiUser className="m-auto h-full w-8 text-subtle" aria-hidden="true" />
                )}
              </span>
              <span className="mt-2 block text-xs font-medium leading-tight text-ink group-hover:text-accent">{person.name}</span>
              {person.character && <span className="mt-0.5 block truncate text-[11px] text-subtle">{person.character}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Similar({ movies, onOpen }) {
  return (
    <section aria-label="More like this" className="mt-8">
      <Heading>More like this</Heading>
      <ul className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {movies.map((movie) => (
          <li key={movie.tmdb_id} className="w-24 shrink-0">
            <button type="button" onClick={() => onOpen(movie)} className="group block w-full text-left" aria-label={`${movie.title}${movie.year ? ` (${movie.year})` : ''}`}>
              <span className="block aspect-[2/3] overflow-hidden rounded ring-1 ring-line/[0.08] transition group-hover:ring-accent/60">
                {movie.poster ? (
                  <img src={movie.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <PosterFallback title={movie.title} />
                )}
              </span>
              <span className="mt-1.5 block truncate text-xs text-muted group-hover:text-ink">{movie.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Where to watch, cast and similar films for the detail drawer. */
export default function MovieExtras({ tmdbId, onOpen, onNavigate }) {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .movieExtras(tmdbId, viewerRegion(), { signal: controller.signal })
      .then((data) => setState(data?.providers ? { status: 'ready', data } : { status: 'error', data: null }))
      .catch((err) => err.code !== 'aborted' && setState({ status: 'error', data: null }));
    return () => controller.abort();
  }, [tmdbId]);

  if (state.status === 'loading') {
    return (
      <div className="mt-8 space-y-3" aria-busy="true" aria-label="Loading where to watch and cast">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    );
  }
  if (state.status === 'error') return null; // the drawer is still useful without extras

  const { providers, cast = [], similar = [] } = state.data;
  return (
    <>
      <WhereToWatch providers={providers} />
      {cast.length > 0 && <Cast cast={cast} onNavigate={onNavigate} />}
      {similar.length > 0 && onOpen && <Similar movies={similar} onOpen={onOpen} />}
    </>
  );
}
