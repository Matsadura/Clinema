import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiFilm, FiMapPin } from 'react-icons/fi';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, Button, EmptyState } from '../components/ui.jsx';
import { useLocationWeather } from '../context/LocationContext.jsx';
import { useSuggestions } from '../hooks/useSuggestions.js';
import { useLibrary } from '../hooks/useLibrary.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { MOODS, parseMoodParam } from '../lib/moods.js';

const EMOJI = Object.fromEntries(MOODS.map((m) => [m.name, m.emoji]));

export default function DiscoverPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const moods = parseMoodParam(params.get('moods'));
  const wantsWeather = params.get('weather') === '1';
  const { coords, locationStatus, locationError, requestLocation } = useLocationWeather();
  const library = useLibrary();
  useDocumentTitle(moods.length ? `${moods.join(', ')} picks` : 'Your picks');

  const needsLocation = wantsWeather && !coords;
  const nothingRequested = !moods.length && !wantsWeather;
  const result = useSuggestions({
    moods,
    coords: wantsWeather ? coords : null,
    enabled: !needsLocation && !nothingRequested,
  });

  const dropWeather = () => {
    const next = new URLSearchParams(params);
    next.delete('weather');
    navigate(`/discover?${next}`, { replace: true });
  };

  const weather = result.data?.weather;

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
          {weather && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-lighter/15 px-3 py-1 text-sm font-medium capitalize text-indigo-200">
              <FiMapPin aria-hidden="true" /> {weather.description}, {weather.temp}°C{weather.city ? ` in ${weather.city}` : ''}
            </span>
          )}
        </div>
      </header>

      {nothingRequested && (
        <EmptyState icon={FiFilm} title="Nothing to match yet" action={<Link to="/#mood" className="rounded-xl bg-primary px-5 py-2.5 font-semibold">Pick a mood</Link>}>
          Choose at least one mood (and optionally your weather) to get recommendations.
        </EmptyState>
      )}

      {needsLocation && (
        <div className="mx-auto max-w-lg">
          {locationStatus === 'denied' || locationStatus === 'unavailable' ? (
            <Alert tone="warning" title="We can't use your weather">
              <p>{locationError}</p>
              {moods.length > 0 && (
                <Button size="sm" variant="secondary" className="mt-3" onClick={dropWeather}>
                  Continue with mood only
                </Button>
              )}
            </Alert>
          ) : (
            <EmptyState
              icon={FiMapPin}
              title="Share your location"
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={requestLocation} loading={locationStatus === 'locating'}>Use my location</Button>
                  {moods.length > 0 && (
                    <Button variant="ghost" onClick={dropWeather}>Mood only</Button>
                  )}
                </div>
              }
            >
              These picks use your local weather, so we need your location to continue.
            </EmptyState>
          )}
        </div>
      )}

      {!needsLocation && !nothingRequested && (
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
              {result.data.warning && (
                <Alert tone="warning" className="mb-6">
                  {result.data.warning} — showing picks for your mood only.
                </Alert>
              )}
              {result.data.source === 'fallback' && (
                <Alert tone="info" className="mb-6">
                  Our AI curator is unavailable right now, so these are popular films that suit your selection.
                </Alert>
              )}
              {result.data.movies.length ? (
                <MovieGrid movies={result.data.movies} library={library} />
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
