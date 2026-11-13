import MovieCard, { MovieCardSkeleton } from './MovieCard.jsx';
import { Alert } from './ui.jsx';
import { useLibrary } from '../hooks/useLibrary.js';
import { useMovieDrawer } from '../context/MovieDrawerContext.jsx';

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

export function MovieGridSkeleton({ count = 12 }) {
  return (
    <div className={GRID} aria-busy="true" aria-label="Loading movies">
      {Array.from({ length: count }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Responsive poster grid; details and actions go through the shared
 *  drawer and library. */
export default function MovieGrid({ movies }) {
  const library = useLibrary();
  const { open, act } = useMovieDrawer();
  const entryFor = (movie) => library.entries[movie.tmdb_id] || {};

  return (
    <>
      {library.error && (
        <Alert className="mb-6" title="Couldn't update your library.">
          {library.error}
        </Alert>
      )}
      <ul className={GRID}>
        {movies.map((movie) => (
          <li key={movie.tmdb_id}>
            <MovieCard
              movie={movie}
              liked={!!entryFor(movie).like}
              saved={!!entryFor(movie).save}
              disliked={!!entryFor(movie).dislike}
              seen={!!entryFor(movie).seen}
              onToggle={act}
              onOpen={open}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
