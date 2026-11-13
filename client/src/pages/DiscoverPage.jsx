import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiFilm, FiRefreshCw, FiStar } from 'react-icons/fi';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, Button, EmptyState } from '../components/ui.jsx';
import { useSuggestions } from '../hooks/useSuggestions.js';
import { useLibrary } from '../hooks/useLibrary.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { MOODS, parseMoodParam } from '../lib/moods.js';

const EMOJI = Object.fromEntries(MOODS.map((m) => [m.name, m.emoji]));

export default function DiscoverPage() {
  const [params] = useSearchParams();
  const moods = parseMoodParam(params.get('moods'));
  const library = useLibrary();
  useDocumentTitle(moods.length ? `${moods.join(', ')} picks` : 'Your picks');

  const nothingRequested = !moods.length;
  const result = useSuggestions({ moods, enabled: !nothingRequested });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/#mood" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <FiArrowLeft aria-hidden="true" /> Change mood
      </Link>

      <header className="mb-10 mt-4">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Your picks</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {moods.map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary-light">
              <span aria-hidden="true">{EMOJI[m]}</span> {m}
            </span>
          ))}
          {result.data?.personalized && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-medium text-amber-200">
              <FiStar aria-hidden="true" /> Personalised for you
            </span>
          )}
        </div>
      </header>

      {nothingRequested && (
        <EmptyState icon={FiFilm} title="Nothing to match yet" action={<Link to="/#mood" className="rounded-xl bg-primary px-5 py-2.5 font-semibold">Pick a mood</Link>}>
          Choose at least one mood to get recommendations.
        </EmptyState>
      )}

      {!nothingRequested && (
        <>
          {result.status === 'error' && (
            <Alert title="We couldn't get recommendations" onRetry={result.retry}>
              {result.error?.message}
            </Alert>
          )}

          {(result.status === 'loading' || result.status === 'idle') && (
            <div>
              <p className="mb-6 flex items-center gap-2 text-sm text-white/60" aria-live="polite">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary-light" aria-hidden="true" />
                Curating films for you — this can take a few seconds…
              </p>
              <MovieGridSkeleton count={12} />
            </div>
          )}

          {result.status === 'success' && (
            <>
              {result.data.source === 'fallback' && (
                <Alert tone="info" className="mb-6">
                  Our AI curator is unavailable right now, so these are popular films that suit your selection.
                </Alert>
              )}
              {result.data.movies.length ? (
                <>
                  <MovieGrid movies={result.data.movies} library={library} />
                  <div className="mt-12 flex flex-col items-center gap-2 text-center">
                    <Button variant="outline" onClick={result.refresh}>
                      <FiRefreshCw aria-hidden="true" /> Show different picks
                    </Button>
                    <p className="text-xs text-white/50">
                      You won&apos;t see these films again. Like or dismiss a few to teach Clinema your taste.
                    </p>
                  </div>
                </>
              ) : (
                <EmptyState icon={FiFilm} title="No matches found" action={<Button onClick={result.retry}>Try again</Button>}>
                  We couldn&apos;t match any films this time. Try a different combination of moods.
                </EmptyState>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
