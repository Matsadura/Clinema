import { Link, useSearchParams } from 'react-router-dom';
import { FiBookmark, FiHeart, FiThumbsDown } from 'react-icons/fi';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, EmptyState } from '../components/ui.jsx';
import { useLibrary } from '../hooks/useLibrary.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const TABS = [
  { id: 'liked', flag: 'like', label: 'Liked', icon: FiHeart, empty: "You haven't liked any films yet." },
  { id: 'saved', flag: 'save', label: 'Watchlist', icon: FiBookmark, empty: 'Your watchlist is empty.' },
  { id: 'hidden', flag: 'dislike', label: 'Not for me', icon: FiThumbsDown, empty: "You haven't dismissed any films." },
];
const HINT = {
  like: 'Tap the heart on any recommendation to add it here.',
  save: 'Tap the bookmark on any recommendation to add it here.',
  dislike: 'Films you mark "not for me" teach Clinema what to avoid. Undo any of them here.',
};

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const library = useLibrary();
  useDocumentTitle('My library');

  const moviesFor = (flag) =>
    Object.entries(library.entries)
      .filter(([, e]) => e[flag])
      .map(([id, e]) => e.movie || { tmdb_id: Number(id), title: `Movie #${id}` });

  const movies = moviesFor(active.flag);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold sm:text-4xl">My library</h1>

      <div role="tablist" aria-label="Library" className="mt-6 inline-flex max-w-full overflow-x-auto rounded-xl bg-white/5 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setParams({ tab: tab.id }, { replace: true })}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${selected ? 'bg-primary text-white' : 'text-white/70 hover:text-white'}`}
            >
              <Icon aria-hidden="true" /> {tab.label}
              {library.status === 'ready' && (
                <span className={`rounded-full px-2 text-xs ${selected ? 'bg-white/20' : 'bg-white/10'}`}>{moviesFor(tab.flag).length}</span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-10">
        {library.status === 'loading' && <MovieGridSkeleton count={6} />}
        {library.status === 'error' && !Object.keys(library.entries).length && (
          <Alert title="Couldn't load your library" onRetry={library.reload}>
            {library.error}
          </Alert>
        )}
        {library.status === 'ready' &&
          (movies.length ? (
            <MovieGrid movies={movies} library={library} />
          ) : (
            <EmptyState
              icon={active.icon}
              title={active.empty}
              action={
                <Link to="/#mood" className="rounded-xl bg-primary px-5 py-2.5 font-semibold hover:bg-primary-light">
                  Find something to watch
                </Link>
              }
            >
              {HINT[active.flag]}
            </EmptyState>
          ))}
      </div>
    </div>
  );
}
