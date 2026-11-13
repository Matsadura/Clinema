import { TiStarFullOutline } from 'react-icons/ti';
import { FiBookmark, FiExternalLink, FiHeart, FiThumbsDown, FiZap } from 'react-icons/fi';
import Modal from './Modal.jsx';
import { PosterFallback } from './MovieCard.jsx';

const LANGUAGES = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'language' }) : null;

function languageName(code) {
  if (!code) return null;
  try {
    return LANGUAGES?.of(code) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export default function MovieDetails({ movie, onClose, liked, saved, disliked, onToggle }) {
  if (!movie) return null;
  const { title, poster, backdrop, year, rating, description, language, tmdb_id: tmdbId, why, fit, tone, director } = movie;
  const genres = Array.isArray(movie.genres) ? movie.genres.slice(0, 4) : [];

  return (
    <Modal open={!!movie} onClose={onClose} title={title} size="lg" hideTitle>
      {backdrop && (
        <div className="relative h-40 w-full overflow-hidden sm:h-56">
          <img src={backdrop} alt="" className="h-full w-full object-cover opacity-60" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent" />
        </div>
      )}
      <div className={`flex flex-col gap-6 p-6 sm:flex-row ${backdrop ? '-mt-20 sm:-mt-28' : 'pt-14'} relative`}>
        <div className="mx-auto w-40 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 sm:mx-0 sm:w-52">
          <div className="aspect-[2/3]">
            {poster ? <img src={poster} alt={`${title} poster`} className="h-full w-full object-cover" /> : <PosterFallback title={title} />}
          </div>
        </div>
        <div className="flex-1 sm:pt-24">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            {year && <span>{year}</span>}
            {rating > 0 && (
              <span className="inline-flex items-center gap-1">
                <TiStarFullOutline className="text-amber-400" aria-hidden="true" />
                <span className="font-semibold text-white">{rating.toFixed(1)}</span>/10
              </span>
            )}
            {language && <span>{languageName(language)}</span>}
            {director && <span>Directed by {director}</span>}
          </div>
          {(genres.length > 0 || tone) && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Genres and tone">
              {genres.map((g) => (
                <li key={g} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">{g}</li>
              ))}
              {tone && <li className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary-light">{tone}</li>}
            </ul>
          )}
          <p className="mt-4 leading-relaxed text-white/80">{description || 'No synopsis available yet.'}</p>
          {(why || fit) && (
            <section className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm" aria-label="Why this pick">
              <h3 className="flex items-center gap-2 font-semibold text-primary-light">
                <FiZap aria-hidden="true" /> Why this pick
              </h3>
              {fit && <p className="mt-2 text-white/80">{fit}</p>}
              {why && <p className="mt-1 text-white/70">{why}</p>}
            </section>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {onToggle && (
              <>
                <button
                  type="button"
                  onClick={() => onToggle(movie, 'like')}
                  aria-pressed={liked}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${liked ? 'bg-rose-500' : 'bg-white/10 hover:bg-white/15'}`}
                >
                  <FiHeart className={liked ? 'fill-current' : ''} aria-hidden="true" /> {liked ? 'Liked' : 'Like'}
                </button>
                <button
                  type="button"
                  onClick={() => onToggle(movie, 'save')}
                  aria-pressed={saved}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${saved ? 'bg-amber-400 text-secondary-dark' : 'bg-white/10 hover:bg-white/15'}`}
                >
                  <FiBookmark className={saved ? 'fill-current' : ''} aria-hidden="true" /> {saved ? 'On watchlist' : 'Watchlist'}
                </button>
                <button
                  type="button"
                  onClick={() => onToggle(movie, 'dislike')}
                  aria-pressed={disliked}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${disliked ? 'bg-slate-200 text-secondary-dark' : 'bg-white/10 hover:bg-white/15'}`}
                >
                  <FiThumbsDown className={disliked ? 'fill-current' : ''} aria-hidden="true" /> {disliked ? 'Not for me' : 'Not for me?'}
                </button>
              </>
            )}
            {tmdbId && (
              <a
                href={`https://www.themoviedb.org/movie/${tmdbId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white/80 hover:text-white"
              >
                View on TMDB <FiExternalLink aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
