import { FiCloudDrizzle, FiCpu, FiFilm, FiSmile } from 'react-icons/fi';

const STEPS = [
  {
    icon: FiSmile,
    title: 'Tell us how you feel',
    body: 'Pick one or more moods — from joyful to reflective.',
  },
  {
    icon: FiCloudDrizzle,
    title: 'Add your weather',
    body: 'Optionally share your location. We look up the live conditions with OpenWeather.',
  },
  {
    icon: FiCpu,
    title: 'AI curates a list',
    body: 'An open-weight LLM on Groq suggests films that fit the mood and the moment.',
  },
  {
    icon: FiFilm,
    title: 'Enriched with TMDB',
    body: 'Each title is matched on TMDB for posters, ratings and synopses. Like or save the ones you love.',
  },
];

export default function HowItWorks({ compact = false }) {
  return (
    <ol className={`grid gap-4 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      {STEPS.map(({ icon: Icon, title, body }, i) => (
        <li key={title} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <span className="absolute right-5 top-4 text-4xl font-extrabold text-white/5" aria-hidden="true">
            {i + 1}
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-xl text-primary-light">
            <Icon aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-bold">{title}</h3>
          <p className="mt-1 text-sm text-white/60">{body}</p>
        </li>
      ))}
    </ol>
  );
}
