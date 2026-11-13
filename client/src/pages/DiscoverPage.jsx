import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiRotateCw } from 'react-icons/fi';
import MoodBar from '../components/MoodBar.jsx';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, Button, EmptyState } from '../components/ui.jsx';
import { useSuggestions } from '../hooks/useSuggestions.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { parseMoodParam } from '../lib/moods.js';

/** One readout for the result set: moods, count and how it was made. */
function ResultsHeader({ moods, status, data, onRefresh }) {
  const ready = status === 'success';
  const meta = [];
  if (ready) {
    meta.push(`${data.movies.length} films`);
    if (data.personalized) meta.push('tuned to your taste');
    if (data.source === 'fallback') meta.push('AI curator unavailable — popular picks');
  }
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line/[0.08] pb-4">
      <div>
        <h2 className="font-display text-display-sm text-ink">{moods.join(' · ')}</h2>
        <p className="num mt-1 text-sm text-muted" aria-live="polite">
          {ready ? meta.join(' · ') : status === 'error' ? 'Something went wrong' : 'Curating films…'}
        </p>
      </div>
      {ready && data.movies.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <FiRotateCw aria-hidden="true" /> Different picks
        </Button>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const moods = parseMoodParam(params.get('moods'));
  const result = useSuggestions({ moods, enabled: moods.length > 0 });
  useDocumentTitle(moods.length ? moods.join(', ') : null);

  const search = (next) => navigate(`/?${new URLSearchParams({ moods: next.join(',') })}`);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <section className="pb-10 pt-12 sm:pt-16">
        <h1 className="font-display text-display text-ink sm:text-display-lg">What do you want to feel tonight?</h1>
        <p className="mt-3 max-w-prose text-muted">
          Pick up to six moods. Every like and dismiss tunes the next list to your taste.
        </p>
        <div className="mt-8">
          <MoodBar value={moods} onSubmit={search} busy={result.status === 'loading'} />
        </div>
      </section>

      {moods.length > 0 && (
        <section aria-label="Recommendations" className="scroll-mt-20">
          <ResultsHeader moods={moods} status={result.status} data={result.data} onRefresh={result.refresh} />

          {result.status === 'error' && (
            <Alert title="We couldn't get recommendations." onRetry={result.retry}>
              {result.error?.message}
            </Alert>
          )}

          {(result.status === 'loading' || result.status === 'idle') && <MovieGridSkeleton count={12} />}

          {result.status === 'success' &&
            (result.data.movies.length ? (
              <MovieGrid movies={result.data.movies} />
            ) : (
              <EmptyState title="No matches this time." action={<Button variant="secondary" onClick={result.retry}>Try again</Button>}>
                Try a different combination of moods.
              </EmptyState>
            ))}
        </section>
      )}
    </div>
  );
}
