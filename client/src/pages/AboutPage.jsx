import { REPO_URL } from '../components/Footer.jsx';
import { textLink } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const STEPS = [
  ['Pick a mood', 'Choose up to six, from joyful to reflective.'],
  ['An AI curator drafts a list', 'An open-weight model on Groq suggests varied, less obvious films that fit — never the same list twice.'],
  ['Every pick is checked', 'Titles are matched on TMDB for posters, ratings and synopses, with a note on why each was chosen.'],
  ['It learns your taste', 'Like, save or dismiss films and Clinema weighs the genres, directors and eras you return to — and what to avoid.'],
];

const STACK = [
  ['Frontend', 'React 18, React Router, Vite, Tailwind CSS'],
  ['Backend', 'Flask 3, SQLAlchemy 2, Alembic, JWT, Gunicorn'],
  ['Data & AI', 'Groq (GPT-OSS 120B), TMDB, MySQL 8'],
  ['Operations', 'Docker multi-stage images, Nginx, Pytest, Vitest'],
];

const TEAM = [
  { name: 'Ali JBARI', github: 'ila36IX', avatar: 104344010 },
  { name: 'Badr ANNABI', github: 'Badr-Annabi', avatar: 73182348 },
  { name: 'Karim ASSIHOUT', github: 'ashtkarim', avatar: 134794355 },
  { name: 'Oumaima NAANAA', github: 'naanaa59', avatar: 138726284 },
  { name: 'Radouane ABOUNOUAS', github: 'RadouaneAbn', avatar: 137453952 },
  { name: 'Zidane ZAOUI', github: 'matsadura', avatar: 132571698 },
];

function Block({ title, children }) {
  return (
    <section className="grid gap-6 border-t border-line/[0.08] py-12 md:grid-cols-[200px_1fr] md:gap-12">
      <h2 className="label pt-1">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  useDocumentTitle('About');
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <header className="pb-12">
        <h1 className="max-w-3xl font-display text-display text-ink sm:text-display-lg">
          A film picker that reads the room, and learns your taste.
        </h1>
        <p className="mt-6 max-w-prose text-lg leading-relaxed text-muted">
          Choosing a film is harder than watching one. Tell Clinema how you feel and an AI curator suggests films for
          the moment. Every like and dismissal refines a taste profile, so the next list is more yours, and never a
          repeat.
        </p>
      </header>

      <Block title="How it works">
        <ol className="space-y-6">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[2rem_1fr] gap-2">
              <span className="num font-display text-2xl leading-none text-accent">{i + 1}</span>
              <div>
                <h3 className="font-medium text-ink">{title}</h3>
                <p className="mt-1 max-w-prose text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="Architecture">
        <p className="max-w-prose text-muted">
          Nginx serves the React app and proxies <code className="text-ink">/api</code> to a Flask API under Gunicorn.
          Provider keys never reach the browser: the API calls Groq and TMDB server-side, blends in your taste
          profile, and falls back to genre-based TMDB discovery if the AI is unavailable.
        </p>
        <dl className="mt-8 border-t border-line/[0.06]">
          {STACK.map(([group, items]) => (
            <div key={group} className="grid gap-1 border-b border-line/[0.06] py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
              <dt className="text-sm text-subtle">{group}</dt>
              <dd className="text-sm text-ink">{items}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title="Team">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((person) => (
            <li key={person.name}>
              <a href={`https://github.com/${person.github}`} target="_blank" rel="noreferrer" className="group flex items-center gap-3">
                <img
                  src={`https://avatars.githubusercontent.com/u/${person.avatar}?v=4&s=80`}
                  alt=""
                  width="40"
                  height="40"
                  loading="lazy"
                  className="h-10 w-10 rounded-full bg-surface grayscale transition duration-200 group-hover:grayscale-0"
                />
                <span>
                  <span className="block text-sm text-ink">{person.name}</span>
                  <span className="block text-xs text-subtle">@{person.github}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className={textLink}>
            Read the source on GitHub
          </a>
        </p>
      </Block>
    </div>
  );
}
