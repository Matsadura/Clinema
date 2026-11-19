// The viewer's country for "where to watch", guessed from the browser
// locale (e.g. "fr-MA" -> "MA"). Falls back to the US, TMDB's default.
const REGION_NAMES = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

export function viewerRegion(languages = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []) {
  const locales = [...languages];
  try {
    locales.push(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    /* no Intl: fall through */
  }
  for (const locale of locales) {
    const match = /^[a-z]{2,3}(?:-[A-Za-z]{4})?-([A-Za-z]{2})\b/.exec(locale || '');
    if (match) return match[1].toUpperCase();
  }
  return 'US';
}

export function regionName(code) {
  try {
    return REGION_NAMES?.of(code) || code;
  } catch {
    return code;
  }
}
