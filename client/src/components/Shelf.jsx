import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import MovieCard, { MovieCardSkeleton } from './MovieCard.jsx';
import { useLibrary } from '../hooks/useLibrary.js';
import { useMovieDrawer } from '../context/MovieDrawerContext.jsx';

export function SectionHeading({ title, children }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <h2 className="shrink-0 font-display text-display-sm text-ink">{title}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-accent/40 via-line/10 to-transparent" aria-hidden="true" />
      {children}
    </div>
  );
}

/** Horizontal, snap-scrolling row of posters with arrow controls. */
export default function Shelf({ title, movies, loading = false, seeAll }) {
  const scroller = useRef(null);
  const library = useLibrary();
  const { open, act } = useMovieDrawer();
  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: 'smooth' });

  if (!loading && !movies.length) return null;

  return (
    <section aria-label={title} className="mb-14">
      <SectionHeading title={title}>
        {seeAll && (
          <Link to={seeAll} className="shrink-0 text-sm text-muted transition-colors hover:text-ink">
            See all
          </Link>
        )}
        <div className="hidden shrink-0 gap-1 sm:flex">
          {[
            [-1, FiChevronLeft, 'Scroll left'],
            [1, FiChevronRight, 'Scroll right'],
          ].map(([dir, Icon, label]) => (
            <button
              key={dir}
              type="button"
              onClick={() => scroll(dir)}
              aria-label={`${label}: ${title}`}
              className="grid h-8 w-8 place-items-center rounded-full border border-line/[0.12] text-muted transition-colors hover:border-line/30 hover:text-ink"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      </SectionHeading>
      <ul
        ref={scroller}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {(loading ? Array.from({ length: 6 }, (_, i) => ({ tmdb_id: `s${i}` })) : movies).map((movie) => {
          const entry = library.entries[movie.tmdb_id] || {};
          return (
            <li key={movie.tmdb_id} className="w-36 shrink-0 snap-start sm:w-40 lg:w-44">
              {loading ? (
                <MovieCardSkeleton />
              ) : (
                <MovieCard
                  movie={movie}
                  liked={!!entry.like}
                  saved={!!entry.save}
                  disliked={!!entry.dislike}
                  seen={!!entry.seen}
                  onToggle={act}
                  onOpen={open}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
