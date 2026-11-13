import { FiBookmark, FiExternalLink, FiHeart, FiThumbsDown } from 'react-icons/fi';
import Modal from './Modal.jsx';
import { PosterFallback, Rating } from './MovieCard.jsx';

const LANGUAGES = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'language' }) : null;

function languageName(code) {
  if (!code) return null;
  try {
    return LANGUAGES?.of(code) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

const ACTIONS = [
  { flag: 'like', icon: FiHeart, label: 'Like', activeLabel: 'Liked', active: 'border-like/50 bg-like/15 text-like' },
  { flag: 'save', icon: FiBookmark, label: 'Watchlist', activeLabel: 'On watchlist', active: 'border-accent/50 bg-accent/15 text-accent' },
  { flag: 'dislike', icon: FiThumbsDown, label: 'Not for me', activeLabel: 'Not for me', active: 'border-dislike/50 bg-dislike/15 text-dislike' },
];

/** Focused detail drawer: everything the card leaves out. */
export default function MovieDetails({ movie, onClose, liked, saved, disliked, onToggle }) {
  if (!movie) return null;
  const { title, poster, backdrop, year, rating, description, language, tmdb_id: tmdbId, why, fit, tone, director } = movie;
  const genres = Array.isArray(movie.genres) ? movie.genres.slice(0, 3) : [];
  const state = { like: liked, save: saved, dislike: disliked };
  const meta = [year, languageName(language)].filter(Boolean);

  return (
    <Modal open={!!movie} onClose={onClose} title={title} variant="drawer" hideTitle>
      <div className="sm:flex-1">
        {backdrop && (
          <div className="relative h-40 overflow-hidden sm:h-52">
            <img src={backdrop} alt="" className="h-full w-full object-cover opacity-50" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
          </div>
        )}

        <div className={`px-6 pb-6 ${backdrop ? '-mt-16 sm:-mt-20' : 'pt-14'} relative`}>
          <div className="flex gap-4">
            <div className="aspect-[2/3] w-24 shrink-0 overflow-hidden rounded ring-1 ring-line/[0.08] sm:w-28">
              {poster ? <img src={poster} alt={`${title} poster`} className="h-full w-full object-cover" /> : <PosterFallback title={title} />}
            </div>
            <div className="flex min-w-0 flex-col justify-end">
              <h2 className="font-display text-display-sm text-ink">{title}</h2>
              <p className="num mt-2 flex flex-wrap gap-x-3 text-sm text-muted">
                {meta.map((m) => (
                  <span key={m}>{m}</span>
                ))}
                <Rating value={rating} />
              </p>
              {director && <p className="mt-1 text-sm text-muted">Directed by {director}</p>}
            </div>
          </div>

          {(genres.length > 0 || tone) && (
            <p className="mt-6 text-sm text-subtle">
              {genres.join(', ')}
              {genres.length > 0 && tone ? ' — ' : ''}
              {tone && <span className="italic">{tone}</span>}
            </p>
          )}

          {(fit || why) && (
            <section aria-label="Why this pick" className="mt-6 border-l-2 border-accent pl-4">
              <h3 className="label">Why this pick</h3>
              {fit && <p className="mt-2 max-w-prose text-ink">{fit}</p>}
              {why && <p className="mt-1 max-w-prose text-muted">{why}</p>}
            </section>
          )}

          <p className="mt-6 max-w-prose leading-relaxed text-muted">{description || 'No synopsis available yet.'}</p>

          {tmdbId && (
            <a
              href={`https://www.themoviedb.org/movie/${tmdbId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-subtle transition-colors hover:text-ink"
            >
              View on TMDB <FiExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {onToggle && (
        <div className="sticky bottom-0 grid grid-cols-3 gap-2 border-t border-line/[0.08] bg-surface p-4">
          {ACTIONS.map(({ flag, icon: Icon, label, activeLabel, active }) => (
            <button
              key={flag}
              type="button"
              onClick={() => onToggle(movie, flag)}
              aria-pressed={state[flag]}
              className={`flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium transition duration-150 ease-out active:scale-[0.97] ${
                state[flag] ? active : 'border-line/[0.12] text-muted hover:border-line/25 hover:text-ink'
              }`}
            >
              <Icon className={`h-4 w-4 ${state[flag] ? 'fill-current' : ''}`} aria-hidden="true" />
              <span className="truncate">{state[flag] ? activeLabel : label}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
