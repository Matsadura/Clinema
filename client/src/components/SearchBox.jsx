import { useEffect, useId, useRef, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { useMovieDrawer } from '../context/MovieDrawerContext.jsx';
import { Rating } from './MovieCard.jsx';
import { Spinner } from './ui.jsx';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/**
 * Film search (ARIA combobox). Debounced, cancels stale requests, keyboard
 * navigable; choosing a result opens it in the shared detail drawer.
 */
export default function SearchBox({ autoFocus = false, onDone }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', results: [], error: null });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { open: openMovie } = useMovieDrawer();
  const rootRef = useRef(null);
  const listId = useId();
  const term = query.trim();

  useEffect(() => {
    if (term.length < MIN_CHARS) {
      setState({ status: 'idle', results: [], error: null });
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, status: 'loading' }));
      api
        .searchMovies(term, { signal: controller.signal })
        .then((results) => {
          setState({ status: 'ready', results: results.slice(0, 8), error: null });
          setActive(-1);
        })
        .catch((err) => err.code !== 'aborted' && setState({ status: 'error', results: [], error: err.message }));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  useEffect(() => {
    const onClick = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (movie) => {
    openMovie(movie);
    setOpen(false);
    setQuery('');
    onDone?.();
  };

  const onKeyDown = (e) => {
    const n = state.results.length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0 && state.results[active]) {
      e.preventDefault();
      choose(state.results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      onDone?.();
    }
  };

  const showPanel = open && term.length >= MIN_CHARS;

  return (
    <div ref={rootRef} className="relative w-full">
      <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
      <input
        type="search"
        role="combobox"
        aria-label="Search for a film"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search for a film…"
        autoComplete="off"
        className="h-11 w-full rounded-full border border-line/10 bg-raised pl-11 pr-10 [&::-webkit-search-cancel-button]:hidden text-sm text-ink placeholder:text-subtle transition-colors duration-150 hover:border-line/20 focus:border-accent/60 focus:outline-none"
      />
      {state.status === 'loading' ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-subtle">
          <Spinner className="h-4 w-4" label="Searching" />
        </span>
      ) : (
        query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-subtle hover:text-ink"
            aria-label="Clear search"
          >
            <FiX className="h-4 w-4" />
          </button>
        )
      )}

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 animate-fade-in overflow-hidden rounded-lg border border-line/10 bg-surface shadow-[0_16px_40px_-12px_rgb(0_0_0/0.5)]">
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto py-1">
            {state.results.map((movie, i) => (
              <li
                key={movie.tmdb_id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(movie)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? 'bg-surface-hover' : ''}`}
              >
                <img src={movie.poster} alt="" width="32" height="48" loading="lazy" className="h-12 w-8 shrink-0 rounded-sm object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{movie.title}</span>
                  <span className="num flex gap-2 text-xs text-muted">
                    {movie.year && <span>{movie.year}</span>}
                    <Rating value={movie.rating} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {state.status === 'ready' && !state.results.length && <p className="px-4 py-3 text-sm text-muted">No films match “{term}”.</p>}
          {state.status === 'error' && <p className="px-4 py-3 text-sm text-dislike">{state.error}</p>}
          {state.status === 'loading' && !state.results.length && <p className="px-4 py-3 text-sm text-subtle">Searching…</p>}
        </div>
      )}
    </div>
  );
}
