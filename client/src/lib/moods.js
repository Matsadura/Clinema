export const MAX_MOODS = 6;

export const MOODS = [
  { name: 'Joyful', emoji: '😊' },
  { name: 'Euphoric', emoji: '🤩' },
  { name: 'Serene', emoji: '😌' },
  { name: 'Grateful', emoji: '🙏' },
  { name: 'Optimistic', emoji: '🌞' },
  { name: 'Hopeful', emoji: '🌟' },
  { name: 'Excited', emoji: '🎉' },
  { name: 'Enthusiastic', emoji: '🤗' },
  { name: 'Astonished', emoji: '😲' },
  { name: 'Intrigued', emoji: '🧐' },
  { name: 'Curious', emoji: '🔎' },
  { name: 'Confident', emoji: '😎' },
  { name: 'Proud', emoji: '🏆' },
  { name: 'Sad', emoji: '😢' },
  { name: 'Depressed', emoji: '😔' },
  { name: 'Stressed', emoji: '😓' },
  { name: 'Angry', emoji: '😡' },
  { name: 'Surprised', emoji: '😮' },
  { name: 'Tired', emoji: '😴' },
  { name: 'Relaxed', emoji: '🛀' },
  { name: 'Bored', emoji: '😐' },
  { name: 'Lonely', emoji: '😞' },
  { name: 'Calm', emoji: '🌊' },
  { name: 'Reflective', emoji: '💭' },
];

const VALID = new Set(MOODS.map((m) => m.name));

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

/** Filter moods by a search term (matches names or emoji). */
export function filterMoods(term) {
  const q = term.trim().toLowerCase();
  if (!q) return MOODS;
  return MOODS.filter((m) => m.name.toLowerCase().includes(q) || m.emoji.includes(q));
}
