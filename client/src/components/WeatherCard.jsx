import { FiMapPin, FiDroplet, FiWind } from 'react-icons/fi';
import { useLocationWeather } from '../context/LocationContext.jsx';
import { Alert, Button, Skeleton } from './ui.jsx';

const CONDITION_STYLES = {
  Clear: 'from-amber-500/30 via-orange-500/10',
  Clouds: 'from-slate-400/30 via-slate-500/10',
  Rain: 'from-sky-600/30 via-blue-700/10',
  Drizzle: 'from-sky-500/30 via-sky-700/10',
  Thunderstorm: 'from-violet-600/30 via-indigo-800/10',
  Snow: 'from-cyan-200/30 via-sky-300/10',
};

function CardShell({ children, tone }) {
  return (
    <div
      id="weather"
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${tone || 'from-secondary-lighter/20 via-primary/5'} to-transparent p-6 shadow-2xl sm:p-8`}
    >
      {children}
    </div>
  );
}

export default function WeatherCard() {
  const { locationStatus, locationError, requestLocation, weather, weatherStatus, weatherError, retryWeather } =
    useLocationWeather();

  if (locationStatus === 'idle' || locationStatus === 'locating') {
    return (
      <CardShell>
        <FiMapPin className="text-3xl text-primary-light" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold">Match the weather outside</h2>
        <p className="mt-2 text-sm text-white/70">
          Share your location and we&apos;ll factor in your local weather. We only use it to look up conditions
          — it&apos;s never stored.
        </p>
        <Button className="mt-6" onClick={requestLocation} loading={locationStatus === 'locating'}>
          {locationStatus === 'locating' ? 'Finding you…' : 'Use my location'}
        </Button>
      </CardShell>
    );
  }

  if (locationStatus === 'denied' || locationStatus === 'unavailable') {
    return (
      <CardShell>
        <h2 className="text-xl font-bold">Weather unavailable</h2>
        <Alert tone="info" className="mt-4">
          {locationError}
        </Alert>
        {locationStatus === 'unavailable' && (
          <Button variant="secondary" className="mt-4" onClick={requestLocation}>
            Try again
          </Button>
        )}
        {locationStatus === 'denied' && (
          <p className="mt-3 text-xs text-white/50">To enable it later, allow location for this site in your browser settings.</p>
        )}
      </CardShell>
    );
  }

  if (weatherStatus === 'error') {
    return (
      <CardShell>
        <h2 className="text-xl font-bold">Weather</h2>
        <Alert className="mt-4" onRetry={retryWeather} title="Couldn't load the weather">
          {weatherError} Mood-based picks still work.
        </Alert>
      </CardShell>
    );
  }

  if (weatherStatus !== 'ready' || !weather) {
    return (
      <CardShell>
        <div aria-busy="true" aria-label="Loading weather">
          <Skeleton className="h-5 w-32" />
          <div className="mt-6 flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          </div>
          <Skeleton className="mt-6 h-4 w-full" />
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell tone={CONDITION_STYLES[weather.condition]}>
      <p className="flex items-center gap-2 text-sm font-medium text-white/70">
        <FiMapPin aria-hidden="true" />
        {weather.city || 'Your location'}
        {weather.country ? `, ${weather.country}` : ''}
      </p>
      <div className="mt-4 flex items-center gap-4">
        {weather.icon && (
          <img
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt=""
            width="96"
            height="96"
            className="-my-2 h-24 w-24 drop-shadow-lg"
          />
        )}
        <div>
          <p className="text-5xl font-extrabold tracking-tight">{weather.temp}°C</p>
          <p className="mt-1 capitalize text-white/80">{weather.description}</p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-3 text-xs text-white/60">
        <div>
          <dt>Feels like</dt>
          <dd className="mt-0.5 text-base font-semibold text-white">{weather.feels_like}°</dd>
        </div>
        {weather.humidity != null && (
          <div>
            <dt className="flex items-center gap-1">
              <FiDroplet aria-hidden="true" /> Humidity
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-white">{weather.humidity}%</dd>
          </div>
        )}
        {weather.wind_speed != null && (
          <div>
            <dt className="flex items-center gap-1">
              <FiWind aria-hidden="true" /> Wind
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-white">{Math.round(weather.wind_speed * 3.6)} km/h</dd>
          </div>
        )}
      </dl>
    </CardShell>
  );
}
