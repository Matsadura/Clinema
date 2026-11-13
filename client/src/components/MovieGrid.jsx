import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCard, { MovieCardSkeleton } from './MovieCard.jsx';
import MovieDetails from './MovieDetails.jsx';
import { Alert } from './ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

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

/**
 * Responsive poster grid with a detail drawer and like/save/dismiss actions.
 * `library` is the return value of useLibrary() (optional).
 */
export default function MovieGrid({ movies, library }) {
  const [selected, setSelected] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleToggle = useCallback(
    (movie, flag) => {
      if (!isAuthenticated) {
        navigate('/auth', { state: { from: window.location.pathname + window.location.search, reason: 'library' } });
        return;
      }
      library?.toggle(movie, flag);
    },
    [isAuthenticated, library, navigate],
  );

  const logView = library?.logView;
  const handleOpen = useCallback(
    (movie) => {
      setSelected(movie);
      logView?.(movie); // browsing signal for the taste profile
    },
    [logView],
  );

  const entryFor = (movie) => library?.entries?.[movie.tmdb_id];

  return (
    <>
      {library?.error && (
        <Alert className="mb-6" title="Couldn't update your library.">
          {library.error}
        </Alert>
      )}
      <ul className={GRID}>
        {movies.map((movie) => (
          <li key={movie.tmdb_id}>
            <MovieCard
              movie={movie}
              liked={!!entryFor(movie)?.like}
              saved={!!entryFor(movie)?.save}
              disliked={!!entryFor(movie)?.dislike}
              onToggle={handleToggle}
              onOpen={handleOpen}
            />
          </li>
        ))}
      </ul>
      <MovieDetails
        movie={selected}
        onClose={() => setSelected(null)}
        liked={selected ? !!entryFor(selected)?.like : false}
        saved={selected ? !!entryFor(selected)?.save : false}
        disliked={selected ? !!entryFor(selected)?.dislike : false}
        onToggle={handleToggle}
      />
    </>
  );
}
