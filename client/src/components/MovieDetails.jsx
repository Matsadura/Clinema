import { TiStarFullOutline } from 'react-icons/ti';
import { FiBookmark, FiExternalLink, FiHeart } from 'react-icons/fi';
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

export default function MovieDetails({ movie, onClose, liked, saved, onToggle }) {
  if (!movie) return null;
  const { title, poster, backdrop, year, rating, description, language, tmdb_id: tmdbId } = movie;

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
          </div>
          <p className="mt-4 leading-relaxed text-white/80">{description || 'No synopsis available yet.'}</p>
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
