import { describe, expect, it } from 'vitest';
import { backdropImage, posterImage, tmdbSrcSet } from './images.js';

describe('TMDB responsive images', () => {
  it('offers smaller poster widths', () => {
    const img = posterImage('https://image.tmdb.org/t/p/w500/a.jpg');
    expect(img.srcSet).toBe(
      'https://image.tmdb.org/t/p/w185/a.jpg 185w, https://image.tmdb.org/t/p/w342/a.jpg 342w, https://image.tmdb.org/t/p/w500/a.jpg 500w',
    );
    expect(img.sizes).toMatch(/180px/);
  });

  it('upgrades the hero backdrop on large screens only', () => {
    const img = backdropImage('https://image.tmdb.org/t/p/w780/b.jpg');
    expect(img.src).toBe('https://image.tmdb.org/t/p/w1280/b.jpg');
    expect(img.srcSet).toContain('/w780/b.jpg 780w');
  });

  it('leaves non-TMDB or missing images alone', () => {
    expect(tmdbSrcSet('https://example.com/x.jpg', [185])).toBeUndefined();
    expect(posterImage(null).srcSet).toBeUndefined();
  });
});
