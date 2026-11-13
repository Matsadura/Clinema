import { describe, expect, it } from 'vitest';
import { MAX_MOODS, MOODS, filterMoods, parseMoodParam } from './moods.js';

describe('parseMoodParam', () => {
  it('keeps known moods, drops unknown and duplicates', () => {
    expect(parseMoodParam('Calm, Sad,Calm,<script>,')).toEqual(['Calm', 'Sad']);
  });

  it('handles empty input', () => {
    expect(parseMoodParam(null)).toEqual([]);
    expect(parseMoodParam('')).toEqual([]);
  });

  it('caps the number of moods', () => {
    const all = MOODS.map((m) => m.name).join(',');
    expect(parseMoodParam(all)).toHaveLength(MAX_MOODS);
  });
});

describe('filterMoods', () => {
  it('matches names case-insensitively and emoji', () => {
    expect(filterMoods('CAL').map((m) => m.name)).toEqual(['Calm']);
    expect(filterMoods('🌊').map((m) => m.name)).toEqual(['Calm']);
    expect(filterMoods('   ')).toHaveLength(MOODS.length);
  });
});
