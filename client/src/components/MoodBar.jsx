import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { MAX_MOODS, filterMoods } from '../lib/moods.js';
import { Button } from './ui.jsx';

const sameSet = (a, b) => a.length === b.length && a.every((m) => b.includes(m));

/**
 * The single discovery control: filter, mood chips, selection readout and
 * submit, in one compact bar. `value` is the mood set currently shown in
 * the results; the bar keeps a draft until the user submits.
 */
export default function MoodBar({ value = [], onSubmit, busy = false }) {
  const [draft, setDraft] = useState(value);
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const valueKey = value.join(',');
  // Moods from the current search lead the row so they're visible even
  // when it scrolls sideways on phones. The order only changes on submit,
  // never while tapping, so chips don't jump under the finger.
  const ordered = useMemo(() => {
    const current = valueKey ? valueKey.split(',') : [];
    return [...current, ...filterMoods('').filter((m) => !current.includes(m))];
  }, [valueKey]);
  const visible = ordered.filter((m) => filterMoods(deferredFilter).includes(m));
  const atLimit = draft.length >= MAX_MOODS;

  // Follow the URL when it changes elsewhere (back/forward navigation)
  useEffect(() => {
    setDraft(valueKey ? valueKey.split(',') : []);
  }, [valueKey]);

  const toggle = (mood) =>
    setDraft((current) =>
      current.includes(mood) ? current.filter((m) => m !== mood) : current.length >= MAX_MOODS ? current : [...current, mood],
    );

  const unchanged = sameSet(draft, value);
  const submit = (e) => {
    e.preventDefault();
    if (draft.length && !unchanged) onSubmit(draft);
  };

  return (
    <form onSubmit={submit} role="search" aria-label="Find films by mood" className="rounded-lg border border-line/[0.08] bg-raised">
      <div className="flex flex-wrap items-center gap-3 border-b border-line/[0.08] p-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <label htmlFor="mood-filter" className="sr-only">
            Filter moods
          </label>
          <input
            id="mood-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter moods"
            autoComplete="off"
            className="field h-9 pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="num text-sm text-subtle" aria-live="polite">
            {draft.length}/{MAX_MOODS}
            <span className="sr-only"> moods selected</span>
          </span>
          {draft.length > 0 && (
            <button type="button" onClick={() => setDraft([])} className="text-sm text-muted transition-colors hover:text-ink">
              Clear
            </button>
          )}
          <Button type="submit" disabled={!draft.length || unchanged} loading={busy && unchanged}>
            Find films
          </Button>
        </div>
      </div>

      <div
        role="group"
        aria-label="Moods"
        className="flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {visible.map((mood) => {
          const active = draft.includes(mood);
          return (
            <button
              key={mood}
              type="button"
              onClick={() => toggle(mood)}
              aria-pressed={active}
              disabled={!active && atLimit}
              className={`h-8 shrink-0 rounded-full border px-3 text-sm transition-colors duration-150 ease-out active:scale-[0.97]
                disabled:cursor-not-allowed disabled:opacity-35 ${
                  active
                    ? 'border-accent bg-accent font-medium text-accent-ink'
                    : 'border-line/[0.12] text-muted hover:border-line/25 hover:text-ink'
                }`}
            >
              {mood}
            </button>
          );
        })}
        {visible.length === 0 && <p className="py-1.5 text-sm text-subtle">No moods match “{filter}”.</p>}
      </div>
    </form>
  );
}
