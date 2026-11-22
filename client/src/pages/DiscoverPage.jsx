import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiPlay, FiRotateCw } from 'react-icons/fi';
import MoodBar from '../components/MoodBar.jsx';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import Shelf, { SectionHeading } from '../components/Shelf.jsx';
import { Alert, Button, EmptyState } from '../components/ui.jsx';
import { useSuggestions } from '../hooks/useSuggestions.js';
import { useTrending } from '../hooks/useTrending.js';
import { useLibrary } from '../hooks/useLibrary.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMovieDrawer } from '../context/MovieDrawerContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { parseMoodParam } from '../lib/moods.js';
import { backdropImage } from '../lib/images.js';

/** Today's featured film: rotates daily through the top trending titles. */
function pickFeatured(movies) {
  const pool = movies.filter((m) => m.backdrop).slice(0, 5);
  if (!pool.length) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  return pool[day % pool.length];
}

const KINDS = [
  { kind: 'movie', label: 'Films' },
  { kind: 'tv', label: 'Series' },
];

function Hero({ featured, moods, kind, onKind, onSearch, busy }) {
  const { open } = useMovieDrawer();
  return (
    <section className="relative isolate overflow-hidden lg:-mt-20">
      {/* Backdrop of a real trending film, faded into the canvas */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {featured?.backdrop && (
          <img
            {...backdropImage(featured.backdrop)}
            alt=""
            // React 18 only passes the lowercase attribute through to the DOM
            // eslint-disable-next-line react/no-unknown-property
            fetchpriority="high"
            className="h-full w-full animate-fade-in object-cover object-[70%_20%] opacity-80 light:opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/75 to-canvas/0" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/10 to-canvas/50" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-36">
        <h1 className="max-w-3xl font-display text-[2.75rem] leading-[1.02] tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl">
          Find your next <em className="text-accent">favourite</em> {kind === 'tv' ? 'series' : 'film'}.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
          Tell us how you want to feel. Clinema curates the rest, and learns your taste as you go.
        </p>

        <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">What&apos;s your mood?</h2>
          <div role="group" aria-label="Recommend" className="flex rounded-full border border-line/[0.12] bg-canvas/70 p-0.5 text-sm backdrop-blur-sm">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                aria-pressed={kind === k.kind}
                onClick={() => onKind(k.kind)}
                className={`rounded-full px-4 py-1.5 transition-colors ${kind === k.kind ? 'bg-accent font-medium text-accent-ink' : 'text-muted hover:text-ink'}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <MoodBar value={moods} onSubmit={onSearch} busy={busy} noun={kind === 'tv' ? 'series' : 'films'} />
      </div>

      {featured && (
        <button
          type="button"
          onClick={() => open(featured)}
          className="group absolute bottom-6 right-4 hidden items-center gap-3 rounded-full border border-line/[0.12] bg-canvas/70 py-1.5 pl-1.5 pr-4 text-left backdrop-blur-sm transition-colors hover:border-line/25 sm:right-6 md:flex lg:right-8"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink">
            <FiPlay className="h-3.5 w-3.5 translate-x-px" aria-hidden="true" />
          </span>
          <span className="text-xs leading-tight">
            <span className="block text-subtle">Featured tonight</span>
            <span className="block font-medium text-ink">
              {featured.title}
              {featured.year ? ` (${featured.year})` : ''}
            </span>
          </span>
        </button>
      )}
    </section>
  );
}

function Recommendations({ moods, kind, result }) {
  const ready = result.status === 'success';
  const noun = kind === 'tv' ? 'series' : 'films';
  const meta = [];
  if (ready) {
    meta.push(`${result.data.movies.length} ${noun} for ${moods.join(', ')}`);
    if (result.data.personalized) meta.push('tuned to your taste');
    if (result.data.source === 'fallback') meta.push('AI curator unavailable — popular picks');
  }
  return (
    <section aria-label="Recommendations" className="mb-16 scroll-mt-24">
      <SectionHeading title="Recommended for you">
        {ready && result.data.movies.length > 0 && (
          <Button variant="ghost" size="sm" onClick={result.refresh}>
            <FiRotateCw aria-hidden="true" /> Different picks
          </Button>
        )}
      </SectionHeading>
      <p className="num -mt-2 mb-6 text-sm text-muted" aria-live="polite">
        {ready ? meta.join(' · ') : result.status === 'error' ? 'Something went wrong' : `Curating ${noun} for ${moods.join(', ')}…`}
      </p>

      {result.status === 'error' && (
        <Alert title="We couldn't get recommendations." onRetry={result.retry}>
          {result.error?.message}
        </Alert>
      )}
      {(result.status === 'loading' || result.status === 'idle') && <MovieGridSkeleton count={12} />}
      {ready &&
        (result.data.movies.length ? (
          <MovieGrid movies={result.data.movies} />
        ) : (
          <EmptyState title="No matches this time." action={<Button variant="secondary" onClick={result.retry}>Try again</Button>}>
            Try a different combination of moods.
          </EmptyState>
        ))}
    </section>
  );
}

export default function DiscoverPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const moods = parseMoodParam(params.get('moods'));
  const kind = params.get('type') === 'series' ? 'tv' : 'movie';
  const result = useSuggestions({ moods, kind, enabled: moods.length > 0 });
  const trending = useTrending();
  const trendingSeries = useTrending('tv');
  const library = useLibrary();
  const { isAuthenticated } = useAuth();
  useDocumentTitle(moods.length ? moods.join(', ') : null);

  const go = (nextMoods, nextKind) =>
    navigate(`/?${new URLSearchParams({ ...(nextMoods.length ? { moods: nextMoods.join(',') } : {}), ...(nextKind === 'tv' ? { type: 'series' } : {}) })}`);
  const libraryShelf = (flag) =>
    Object.values(library.entries)
      .filter((e) => e[flag] && e.movie)
      .map((e) => e.movie);

  return (
    <>
      <Hero
        featured={pickFeatured(trending.movies)}
        moods={moods}
        kind={kind}
        onKind={(next) => go(moods, next)}
        onSearch={(next) => go(next, kind)}
        busy={result.status === 'loading'}
      />

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        {moods.length > 0 && <Recommendations moods={moods} kind={kind} result={result} />}

        <Shelf title="Trending films" movies={trending.movies} loading={trending.status === 'loading'} />
        <Shelf title="Trending series" movies={trendingSeries.movies} loading={trendingSeries.status === 'loading'} />
        {isAuthenticated && (
          <>
            <Shelf title="Your watchlist" movies={libraryShelf('save')} seeAll="/library?tab=saved" />
            <Shelf title="Liked" movies={libraryShelf('like')} seeAll="/library?tab=liked" />
          </>
        )}
      </div>
    </>
  );
}
