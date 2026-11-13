import { Link } from 'react-router-dom';
import { VscGithub } from 'react-icons/vsc';
import logo from '../images/brand-logo-light.svg';

export const REPO_URL = 'https://github.com/Matsadura/Clinema';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-secondary-darker">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <img src={logo} alt="Clinema" className="h-8 w-auto" width="120" height="32" loading="lazy" />
          <p className="mt-3 max-w-xs text-sm text-white/50">
            The right movie for how you feel and what it&apos;s like outside — picked by AI.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link to="/" className="text-white/70 hover:text-primary-light">Discover</Link>
          <Link to="/about" className="text-white/70 hover:text-primary-light">How it works</Link>
          <Link to="/library" className="text-white/70 hover:text-primary-light">My library</Link>
          <Link to="/profile" className="text-white/70 hover:text-primary-light">Profile</Link>
        </nav>
        <div className="text-sm text-white/50 md:text-right">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white/70 hover:text-primary-light">
            <VscGithub aria-hidden="true" /> Source on GitHub
          </a>
          <p className="mt-3">
            Movie data from{' '}
            <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="underline hover:text-white">
              TMDB
            </a>
            . Weather from{' '}
            <a href="https://openweathermap.org/" target="_blank" rel="noreferrer" className="underline hover:text-white">
              OpenWeather
            </a>
            .
          </p>
          <p className="mt-1 text-xs">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        </div>
      </div>
      <p className="border-t border-white/5 py-4 text-center text-xs text-white/40">
        &copy; {new Date().getFullYear()} Clinema
      </p>
    </footer>
  );
}
