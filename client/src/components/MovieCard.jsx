import { memo, useState } from 'react';
import { FiBookmark, FiCheck, FiHeart, FiThumbsDown } from 'react-icons/fi';
import { Skeleton } from './ui.jsx';

/** Typographic fallback when a poster is missing: no stock icon. */
export function PosterFallback({ title, year }) {
  return (
    <div className="flex h-full w-full flex-col justify-end bg-surface p-4">
      <span className="font-display text-xl leading-tight text-ink line-clamp-4">{title}</span>
      {year && <span className="num mt-1 text-xs text-subtle">{year}</span>}
    </div>
  );
}

/** Rating as a quiet amber figure; shared by card and drawer. */
export function Rating({ value, className = '' }) {
  if (!(value > 0)) return null;
  return (
    <span className={`num text-accent ${className}`}>
      <span aria-hidden="true">★ </span>
      {value.toFixed(1)}
      <span className="sr-only"> out of 10</span>
    </span>
  );
}

const ACTIONS = [
  { flag: 'like', icon: FiHeart, on: 'Unlike', off: 'Like', active: 'bg-like text-canvas' },
  { flag: 'save', icon: FiBookmark, on: 'Remove from watchlist', off: 'Add to watchlist', active: 'bg-accent text-accent-ink' },
  { flag: 'seen', icon: FiCheck, on: 'Mark as not seen', off: 'Mark as seen', active: 'bg-ink text-canvas' },
  { flag: 'dislike', icon: FiThumbsDown, on: 'Undo not for me', off: 'Not for me', active: 'bg-dislike text-canvas' },
];

function MovieCard({ movie, liked = false, saved = false, disliked = false, seen = false, onToggle, onOpen }) {
  const [imageFailed, setImageFailed] = useState(false);
  const { title, poster, year, rating } = movie;
  const state = { like: liked, save: saved, dislike: disliked, seen };

  return (
    <article className="group animate-fade-in">
      <div className="relative">
        <button
          type="button"
          onClick={() => onOpen?.(movie)}
          className="block aspect-[2/3] w-full overflow-hidden rounded bg-surface ring-1 ring-line/[0.08] transition duration-200 ease-out
            group-hover:ring-line/20"
          aria-label={`${title}${year ? ` (${year})` : ''}, view details`}
        >
          {poster && !imageFailed ? (
            <img
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              width="500"
              height="750"
              onError={() => setImageFailed(true)}
              className={`h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.02] ${
                disliked ? 'opacity-40 grayscale' : ''
              }`}
            />
          ) : (
            <PosterFallback title={title} year={year} />
          )}
        </button>

        {/* Persistent state marks: only for states that are on */}
        {(liked || saved || seen) && (
          <div className="pointer-events-none absolute left-2 top-2 flex gap-1" aria-hidden="true">
            {liked && <span className="grid h-6 w-6 place-items-center rounded-full bg-canvas/85 text-like"><FiHeart className="h-3.5 w-3.5 fill-current" /></span>}
            {saved && <span className="grid h-6 w-6 place-items-center rounded-full bg-canvas/85 text-accent"><FiBookmark className="h-3.5 w-3.5 fill-current" /></span>}
            {seen && <span className="grid h-6 w-6 place-items-center rounded-full bg-canvas/85 text-ink"><FiCheck className="h-3.5 w-3.5" /></span>}
          </div>
        )}

        {/* Quick actions on hover/focus (pointer devices). On touch screens
            the detail drawer is the single place for these actions. */}
        {onToggle && (
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center gap-2 rounded-b bg-gradient-to-t from-black/85 to-transparent p-3 pt-10
              opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100
              [@media(hover:none)]:hidden"
          >
            {ACTIONS.map(({ flag, icon: Icon, on, off, active }) => (
              <button
                key={flag}
                type="button"
                onClick={() => onToggle(movie, flag)}
                aria-pressed={state[flag]}
                aria-label={`${state[flag] ? on : off}: ${title}`}
                title={state[flag] ? on : off}
                className={`grid h-9 w-9 place-items-center rounded-full transition duration-150 ease-out active:scale-90 ${
                  state[flag] ? active : 'bg-canvas/80 text-ink hover:bg-canvas'
                }`}
              >
                <Icon className={`h-4 w-4 ${state[flag] ? 'fill-current' : ''}`} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      <h3 className="mt-3 text-sm font-medium text-ink line-clamp-1">{title}</h3>
      <p className="num mt-0.5 flex gap-2 text-xs text-muted">
        {year && <span>{year}</span>}
        <Rating value={rating} />
      </p>
    </article>
  );
}

export default memo(MovieCard);

export function MovieCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="mt-3 h-3.5 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  );
}
