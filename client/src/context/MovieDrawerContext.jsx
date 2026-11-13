import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MovieDetails from '../components/MovieDetails.jsx';
import { useAuth } from './AuthContext.jsx';
import { useLibrary } from '../hooks/useLibrary.js';

const DrawerContext = createContext(null);

/**
 * One detail drawer for the whole app: grids, shelves, search results and
 * history all call open(movie). act(movie, flag) applies a library action,
 * sending signed-out visitors to sign in first.
 */
export function MovieDrawerProvider({ children }) {
  const [movie, setMovie] = useState(null);
  const library = useLibrary();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle, logView, entries } = library;

  const open = useCallback(
    (next) => {
      setMovie(next);
      logView(next); // browsing signal for the taste profile
    },
    [logView],
  );

  const act = useCallback(
    (target, flag) => {
      if (!isAuthenticated) {
        setMovie(null);
        navigate('/auth', { state: { from: location.pathname + location.search, reason: 'library' } });
        return;
      }
      toggle(target, flag);
    },
    [isAuthenticated, navigate, location.pathname, location.search, toggle],
  );

  const value = useMemo(() => ({ open, act }), [open, act]);
  const entry = movie ? entries[movie.tmdb_id] || {} : {};

  return (
    <DrawerContext.Provider value={value}>
      {children}
      <MovieDetails
        movie={movie}
        onClose={() => setMovie(null)}
        liked={!!entry.like}
        saved={!!entry.save}
        disliked={!!entry.dislike}
        seen={!!entry.seen}
        onToggle={act}
      />
    </DrawerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMovieDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useMovieDrawer must be used inside <MovieDrawerProvider>');
  return ctx;
}
