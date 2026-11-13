import { useNavigate, Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import MoodPicker from '../components/MoodPicker.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
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

export default function HomePage() {
  useDocumentTitle(null);
  const navigate = useNavigate();

  const handleSubmit = ({ moods }) => {
    navigate(`/discover?${new URLSearchParams({ moods: moods.join(',') })}`);
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-4 pb-6 pt-14 text-center sm:px-6 md:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-light" aria-hidden="true" /> AI-powered recommendations
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Tell us how you feel.
            <span className="block bg-gradient-to-r from-green-100 to-primary-light bg-clip-text text-transparent">
              We&apos;ll find the film.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
            Pick a mood and an AI curator suggests films to match. Every like and dismiss teaches it your taste, so the
            picks keep getting better — and never repeat.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#mood" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold hover:bg-primary-light">
              Pick your mood <FiArrowRight aria-hidden="true" />
            </a>
            <Link to="/about" className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 font-semibold hover:border-white/30">
              How it works
            </Link>
          </div>
        </div>
      </section>

      <Section id="mood" eyebrow="Start here" title="How do you want to feel?">
        <MoodPicker onSubmit={handleSubmit} />
      </Section>

      <Section id="how" eyebrow="Under the hood" title="How Clinema works">
        <HowItWorks />
      </Section>
    </>
  );
}
