import { useDeferredValue, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { MAX_MOODS, filterMoods } from '../lib/moods.js';
import { Button } from './ui.jsx';

/**
 * Mood chips + submit action.
 * onSubmit({ moods }) is called when the user asks for picks.
 */
export default function MoodPicker({ onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const visible = filterMoods(deferredSearch);
  const atLimit = selected.length >= MAX_MOODS;

  const toggle = (name) => {
    setSelected((current) =>
      current.includes(name) ? current.filter((m) => m !== name) : current.length >= MAX_MOODS ? current : [...current, name],
    );
  };

  return (
    <div>
      <div className="relative mx-auto max-w-md">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
        <label htmlFor="mood-search" className="sr-only">
          Search moods
        </label>
        <input
          id="mood-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search moods, e.g. calm, curious…"
          className="w-full rounded-xl border border-white/10 bg-secondary-darker py-3 pl-11 pr-4 text-sm placeholder-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3" role="group" aria-label="Moods">
        {visible.map((mood) => {
          const active = selected.includes(mood.name);
          return (
            <button
              key={mood.name}
              type="button"
              onClick={() => toggle(mood.name)}
              aria-pressed={active}
              disabled={!active && atLimit}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition sm:text-base
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light disabled:cursor-not-allowed disabled:opacity-40
                ${active ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-white/10 bg-white/5 text-white/85 hover:border-primary/60 hover:bg-white/10'}`}
            >
              <span aria-hidden="true">{mood.emoji}</span>
              {mood.name}
            </button>
          );
        })}
        {visible.length === 0 && <p className="text-sm text-white/50">No moods match “{search}”.</p>}
      </div>

      <div className="mt-6 flex min-h-[2rem] flex-wrap items-center justify-center gap-2 text-sm text-white/60" aria-live="polite">
        {selected.length > 0 ? (
          <>
            <span>
              {selected.length} selected{atLimit ? ` (max ${MAX_MOODS})` : ''}
            </span>
            <button type="button" onClick={() => setSelected([])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/5 hover:text-white">
              <FiX aria-hidden="true" /> Clear
            </button>
          </>
        ) : (
          <span>Pick one or more moods to get started.</span>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <Button size="lg" disabled={!selected.length} onClick={() => onSubmit({ moods: selected })}>
          Match my mood
        </Button>
      </div>
    </div>
  );
}
