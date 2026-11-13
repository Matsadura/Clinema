import { VscGithub } from 'react-icons/vsc';
import HowItWorks from '../components/HowItWorks.jsx';
import { REPO_URL } from '../components/Footer.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const TEAM = [
  { name: 'Ali JBARI', github: 'ila36IX', avatar: 104344010 },
  { name: 'Badr ANNABI', github: 'Badr-Annabi', avatar: 73182348 },
  { name: 'Karim ASSIHOUT', github: 'ashtkarim', avatar: 134794355 },
  { name: 'Oumaima NAANAA', github: 'naanaa59', avatar: 138726284 },
  { name: 'Radouane ABOUNOUAS', github: 'RadouaneAbn', avatar: 137453952 },
  { name: 'Zidane ZAOUI', github: 'matsadura', avatar: 132571698 },
];

const STACK = [
  { group: 'Frontend', items: ['React 18', 'React Router', 'Vite', 'Tailwind CSS'] },
  { group: 'Backend', items: ['Flask 3', 'SQLAlchemy 2', 'JWT auth', 'Gunicorn'] },
  { group: 'Data & AI', items: ['Groq · GPT-OSS 120B', 'TMDB API', 'OpenWeather API', 'MySQL 8'] },
  { group: 'Ops', items: ['Docker multi-stage', 'Nginx', 'Compose healthchecks', 'Pytest · Vitest'] },
];

const FLOW = ['Browser (React SPA)', 'Nginx', 'Flask API', 'OpenWeather · Groq · TMDB', 'MySQL'];

export default function AboutPage() {
  useDocumentTitle('How it works');
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-light">About Clinema</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">A movie picker that reads the room — and the sky.</h1>
        <p className="mt-5 text-lg text-white/70">
          Choosing a film is harder than watching one. Clinema blends how you feel with the weather where you are and
          asks an AI curator for films that suit the moment, then enriches every pick with real data from TMDB.
        </p>
      </header>

      <section className="mt-14" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-2xl font-bold">How it works</h2>
        <div className="mt-6">
          <HowItWorks />
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-2" aria-labelledby="arch-heading">
        <div>
          <h2 id="arch-heading" className="text-2xl font-bold">Architecture</h2>
          <p className="mt-3 text-white/70">
            The React app is served by Nginx, which also proxies <code className="rounded bg-white/10 px-1">/api</code> to
            a Flask API running under Gunicorn. API keys never reach the browser: the API calls OpenWeather, Groq and TMDB
            server-side, caches responses, and falls back to genre-based TMDB discovery if the AI is unavailable.
          </p>
          <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            {FLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">{step}</span>
                {i < FLOW.length - 1 && <span className="text-white/30" aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {STACK.map(({ group, items }) => (
            <div key={group} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">{group}</h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="team-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="team-heading" className="text-2xl font-bold">The team</h2>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-light hover:underline">
            <VscGithub aria-hidden="true" /> View the source
          </a>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TEAM.map((person) => (
            <li key={person.name}>
              <a
                href={`https://github.com/${person.github}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center transition hover:-translate-y-1 hover:border-primary/50"
              >
                <img
                  src={`https://avatars.githubusercontent.com/u/${person.avatar}?v=4&s=160`}
                  alt=""
                  width="80"
                  height="80"
                  loading="lazy"
                  className="h-20 w-20 rounded-full bg-secondary-light"
                />
                <span className="mt-3 text-sm font-semibold">{person.name}</span>
                <span className="mt-0.5 text-xs text-white/50">@{person.github}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
