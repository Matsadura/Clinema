export const MAX_MOODS = 6;

// Ordered from bright, through curious and calm, to heavy, so related
// moods sit together in the control bar.
export const MOODS = [
  'Joyful',
  'Euphoric',
  'Excited',
  'Enthusiastic',
  'Optimistic',
  'Hopeful',
  'Confident',
  'Proud',
  'Grateful',
  'Curious',
  'Intrigued',
  'Astonished',
  'Surprised',
  'Calm',
  'Serene',
  'Relaxed',
  'Reflective',
  'Tired',
  'Bored',
  'Lonely',
  'Sad',
  'Depressed',
  'Stressed',
  'Angry',
];

const VALID = new Set(MOODS);

/** Parse a comma-separated `moods` query param into known mood names. */
export function parseMoodParam(value) {
  if (!value) return [];
  const seen = new Set();
  for (const raw of value.split(',')) {
    const name = raw.trim();
    if (VALID.has(name)) seen.add(name);
  }
  return [...seen].slice(0, MAX_MOODS);
}

/** Filter moods by a search term. */
export function filterMoods(term) {
  const q = term.trim().toLowerCase();
  if (!q) return MOODS;
  return MOODS.filter((m) => m.toLowerCase().includes(q));
}
