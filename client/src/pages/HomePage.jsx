import { useNavigate, Link } from 'react-router-dom';
import { FiArrowRight, FiCloud } from 'react-icons/fi';
import WeatherCard from '../components/WeatherCard.jsx';
import MoodPicker from '../components/MoodPicker.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import MovieGrid, { MovieGridSkeleton } from '../components/MovieGrid.jsx';
import { Alert, Button, EmptyState } from '../components/ui.jsx';
import { useLocationWeather } from '../context/LocationContext.jsx';
import { useSuggestions } from '../hooks/useSuggestions.js';
import { useLibrary } from '../hooks/useLibrary.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function Section({ id, eyebrow, title, children, action }) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-primary-light">{eyebrow}</p>}
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function WeatherPicks({ library }) {
  const { coords, locationStatus, requestLocation, weather } = useLocationWeather();
  const picks = useSuggestions({ coords, enabled: !!coords });

  if (!coords) {
    return (
      <EmptyState
        icon={FiCloud}
        title="See what fits today's weather"
        action={
          locationStatus === 'denied' ? null : (
            <Button onClick={requestLocation} loading={locationStatus === 'locating'}>
              Use my location
            </Button>
          )
        }
      >
        {locationStatus === 'denied'
          ? 'Location access is off, so weather picks are unavailable. Mood picks above still work great.'
          : 'Share your location to get films chosen for the conditions outside right now.'}
      </EmptyState>
    );
  }

  if (picks.status === 'error') {
    return (
      <Alert title="Couldn't load weather picks" onRetry={picks.retry}>
        {picks.error?.message}
      </Alert>
    );
  }
  if (picks.status !== 'success') {
    return (
      <div>
        <p className="mb-6 text-sm text-white/60" aria-live="polite">
          Asking the AI for films that suit {weather ? `${weather.description} at ${weather.temp}°C` : 'your weather'}…
        </p>
        <MovieGridSkeleton count={6} />
      </div>
    );
  }
  const movies = picks.data.movies.slice(0, 12);
  return (
    <>
      {picks.data.source === 'fallback' && (
        <Alert tone="info" className="mb-6">
          Our AI curator is taking a break, so these are popular picks for the weather instead.
        </Alert>
      )}
      <MovieGrid movies={movies} library={library} />
      <div className="mt-10 flex justify-center">
        <Button variant="outline" onClick={picks.refresh}>
          Show different picks
        </Button>
      </div>
    </>
  );
}

export default function HomePage() {
  useDocumentTitle(null);
  const navigate = useNavigate();
  const { coords, requestLocation, locationStatus } = useLocationWeather();
  const library = useLibrary();

  const handleSubmit = ({ moods, withWeather }) => {
    const params = new URLSearchParams();
    if (moods.length) params.set('moods', moods.join(','));
    if (withWeather) params.set('weather', '1');
    navigate(`/discover?${params}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-10 pt-12 sm:px-6 md:grid-cols-2 md:pt-20 lg:px-8">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-light" aria-hidden="true" /> AI-powered recommendations
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Mood &amp; weather.
              <span className="block bg-gradient-to-r from-green-100 to-primary-light bg-clip-text text-transparent">
                Your movie match.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg md:mx-0">
              Tell Clinema how you feel, and it combines that with the weather outside your window to pick films
              you&apos;ll actually want to watch tonight.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <a href="#mood" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold hover:bg-primary-light">
                Pick your mood <FiArrowRight aria-hidden="true" />
              </a>
              <Link to="/about" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 font-semibold hover:border-white/30">
                How it works
              </Link>
            </div>
          </div>
          <WeatherCard />
        </div>
      </section>

      <Section id="mood" eyebrow="Step 1" title="How do you want to feel?">
        <MoodPicker
          onSubmit={handleSubmit}
          hasLocation={!!coords}
          onRequestLocation={requestLocation}
          locating={locationStatus === 'locating'}
        />
      </Section>

      <Section id="weather-picks" eyebrow="Right now" title="Picks for your weather">
        <WeatherPicks library={library} />
      </Section>

      <Section id="how" eyebrow="Under the hood" title="How Clinema works">
        <HowItWorks />
      </Section>
    </>
  );
}
