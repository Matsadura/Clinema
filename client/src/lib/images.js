// TMDB serves each image in several widths; let the browser pick the
// smallest that's sharp enough instead of always loading w500/w1280.
const SIZE = /\/t\/p\/(w\d+|original)\//;

export function tmdbSrcSet(url, widths) {
  if (!url || !SIZE.test(url)) return undefined;
  return widths.map((w) => `${url.replace(SIZE, `/t/p/w${w}/`)} ${w}w`).join(', ');
}

/** Poster cards are ~140-180px wide (two columns on phones). */
export const posterImage = (url) => ({
  src: url,
  srcSet: tmdbSrcSet(url, [185, 342, 500]),
  sizes: '(min-width: 640px) 180px, 45vw',
});

/** Full-bleed backdrops. */
export const backdropImage = (url) => ({
  src: url?.replace('/w780/', '/w1280/'),
  srcSet: tmdbSrcSet(url, [780, 1280]),
  sizes: '100vw',
});
