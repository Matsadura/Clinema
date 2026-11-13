import { memo, useState } from 'react';
import { TiStarFullOutline } from 'react-icons/ti';
import { FiBookmark, FiHeart, FiThumbsDown } from 'react-icons/fi';
import { MdMovie } from 'react-icons/md';
import { Skeleton } from './ui.jsx';

export function PosterFallback({ title }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary-light to-secondary p-4 text-center text-white/60">
      <MdMovie className="text-4xl" aria-hidden="true" />
      <span className="line-clamp-3 text-sm font-semibold">{title}</span>
    </div>
  );
}

export function ActionButton({ active, onClick, label, activeClass, children }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur transition hover:scale-110
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${active ? activeClass : 'bg-black/55 text-white hover:bg-black/75'}`}
    >
      {children}
    </button>
  );
}

function MovieCard({ movie, liked = false, saved = false, disliked = false, onToggle, onOpen }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { title, poster, year, rating } = movie;

  return (
    <article className={`group relative animate-fade-in transition ${disliked ? 'opacity-50 hover:opacity-100' : ''}`}>
      <button
        type="button"
        onClick={() => onOpen?.(movie)}
        className="block w-full overflow-hidden rounded-2xl bg-secondary-light text-left shadow-lg ring-1 ring-white/5 transition
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light group-hover:-translate-y-1 group-hover:shadow-2xl"
        aria-label={`${title}${year ? ` (${year})` : ''} — view details`}
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {disliked && (
            <span className="absolute bottom-2 left-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold">
              Not for me
            </span>
          )}
          {poster && !imageFailed ? (
            <img
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              width="500"
              height="750"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <PosterFallback title={title} />
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-semibold sm:text-base">{title}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
            {year && <span>{year}</span>}
            {rating > 0 && (
              <span className="inline-flex items-center gap-1">
                <TiStarFullOutline className="text-amber-400" aria-hidden="true" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </button>

      {onToggle && (
        <div className="absolute right-2 top-2 flex flex-col gap-2 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <ActionButton active={liked} onClick={() => onToggle(movie, 'like')} label={liked ? `Unlike ${title}` : `Like ${title}`} activeClass="bg-rose-500 text-white">
            <FiHeart className={liked ? 'fill-current' : ''} aria-hidden="true" />
          </ActionButton>
          <ActionButton active={saved} onClick={() => onToggle(movie, 'save')} label={saved ? `Remove ${title} from watchlist` : `Save ${title} to watchlist`} activeClass="bg-amber-400 text-secondary-dark">
            <FiBookmark className={saved ? 'fill-current' : ''} aria-hidden="true" />
          </ActionButton>
          <ActionButton
            active={disliked}
            onClick={() => onToggle(movie, 'dislike')}
            label={disliked ? `Undo "not for me" on ${title}` : `Not for me: ${title}`}
            activeClass="bg-slate-200 text-secondary-dark"
          >
            <FiThumbsDown className={disliked ? 'fill-current' : ''} aria-hidden="true" />
          </ActionButton>
        </div>
      )}
    </article>
  );
}

export default memo(MovieCard);

export function MovieCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  );
}
