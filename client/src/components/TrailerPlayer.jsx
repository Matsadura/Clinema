import { useEffect, useState } from 'react';
import { FiPlay } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { Skeleton } from './ui.jsx';

const embedUrl = (key) =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
const thumbnail = (key) => `https://i.ytimg.com/vi/${encodeURIComponent(key)}/hqdefault.jpg`;

/** "Trailer", or "Trailer 2" when there are several of a kind. */
function label(video, all) {
  const sameType = all.filter((v) => v.type === video.type);
  return sameType.length > 1 ? `${video.type} ${sameType.indexOf(video) + 1}` : video.type;
}

/**
 * Plays a film's trailer inside the drawer. The YouTube player only loads once
 * the viewer presses play (a still stands in), from the privacy-
 * enhanced youtube-nocookie.com domain. Renders nothing when there's no trailer.
 */
export default function TrailerPlayer({ tmdbId, title, backdrop }) {
  const [state, setState] = useState({ status: 'loading', videos: [] });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .trailers(tmdbId, { signal: controller.signal })
      .then((videos) => setState({ status: 'ready', videos: Array.isArray(videos) ? videos : [] }))
      .catch((err) => err.code !== 'aborted' && setState({ status: 'error', videos: [] }));
    return () => controller.abort();
  }, [tmdbId]);

  if (state.status === 'loading') {
    return <Skeleton className="mt-6 aspect-video w-full" />;
  }
  if (!state.videos.length) return null; // no trailer, or TMDB unreachable: stay quiet

  const { videos } = state;
  const video = videos[active];
  const still = active === 0 && backdrop ? backdrop : thumbnail(video.key);

  return (
    <section aria-label="Trailer" className="mt-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black ring-1 ring-line/[0.08]">
        {playing ? (
          <iframe
            key={video.key}
            src={embedUrl(video.key)}
            title={`${title}: ${video.name}`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center"
            aria-label={`Play trailer: ${title}`}
          >
            <img src={still} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity duration-200 group-hover:opacity-90" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span className="relative flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink shadow-lg transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95">
              <FiPlay className="h-4 w-4 fill-current" aria-hidden="true" />
              Play {video.type.toLowerCase()}
            </span>
          </button>
        )}
      </div>

      {videos.length > 1 && (
        <div role="group" aria-label="Choose a video" className="mt-3 flex flex-wrap gap-2">
          {videos.map((v, i) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={i === active}
              title={v.name}
              onClick={() => setActive(i)}
              className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors duration-150 ${
                i === active ? 'border-accent/60 bg-accent/15 text-accent' : 'border-line/[0.12] text-muted hover:border-line/25 hover:text-ink'
              }`}
            >
              {label(v, videos)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
