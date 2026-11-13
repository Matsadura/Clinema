import { Link, useSearchParams } from 'react-router-dom';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, EmptyState, textLink } from '../components/ui.jsx';
import { useLibrary } from '../hooks/useLibrary.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const TABS = [
  { id: 'liked', flag: 'like', label: 'Liked', empty: 'Nothing liked yet.', hint: 'Like a film from any list and it lands here.' },
  { id: 'saved', flag: 'save', label: 'Watchlist', empty: 'Your watchlist is empty.', hint: 'Save films you mean to watch.' },
  { id: 'seen', flag: 'seen', label: 'Seen', empty: 'Nothing marked as seen.', hint: 'Mark films you’ve watched — they won’t be recommended again.' },
  {
    id: 'hidden',
    flag: 'dislike',
    label: 'Not for me',
    empty: 'Nothing dismissed.',
    hint: 'Dismissed films teach Clinema what to avoid. Undo any of them here.',
  },
];

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const library = useLibrary();
  useDocumentTitle('Library');

  const moviesFor = (flag) =>
    Object.entries(library.entries)
      .filter(([, e]) => e[flag])
      .map(([id, e]) => e.movie || { tmdb_id: Number(id), title: `Movie #${id}` });
  const movies = moviesFor(active.flag);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-display text-ink">Library</h1>

      <div
        role="tablist"
        aria-label="Library"
        className="mt-8 flex gap-8 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_rgb(var(--line)/0.08)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setParams({ tab: tab.id }, { replace: true })}
              className={`relative shrink-0 pb-3 text-sm transition-colors duration-150 ${
                selected ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {tab.label}
              {library.status === 'ready' && <span className="num ml-2 text-subtle">{moviesFor(tab.flag).length}</span>}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-8">
        {library.status === 'loading' && <MovieGridSkeleton count={6} />}
        {library.status === 'error' && !Object.keys(library.entries).length && (
          <Alert title="Couldn't load your library." onRetry={library.reload}>
            {library.error}
          </Alert>
        )}
        {library.status === 'ready' &&
          (movies.length ? (
            <MovieGrid movies={movies} />
          ) : (
            <EmptyState
              title={active.empty}
              action={
                <Link to="/" className={textLink}>
                  Find something to watch
                </Link>
              }
            >
              {active.hint}
            </EmptyState>
          ))}
      </div>
    </div>
  );
}
