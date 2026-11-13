import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { MAX_MOODS, MOODS, filterMoods } from '../lib/moods.js';
import { FEATURED_MOODS, MOOD_ICONS } from '../lib/moodIcons.js';
import { Button } from './ui.jsx';

const sameSet = (a, b) => a.length === b.length && a.every((m) => b.includes(m));

function MoodChip({ mood, active, disabled, onToggle }) {
  const Icon = MOOD_ICONS[mood];
  return (
    <button
      type="button"
      onClick={() => onToggle(mood)}
      aria-pressed={active}
      disabled={disabled}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition duration-150 ease-out active:scale-[0.97]
        disabled:cursor-not-allowed disabled:opacity-35 ${
          active
            ? 'border-accent bg-accent font-medium text-accent-ink'
            : 'border-line/[0.12] bg-canvas/60 text-ink hover:border-line/30 hover:bg-surface'
        }`}
    >
      {Icon && <Icon className={`h-[18px] w-[18px] ${active ? '' : 'text-muted'}`} aria-hidden="true" />}
      {mood}
    </button>
  );
}

/**
 * Discovery control: featured mood chips, "More moods" (all 24 + filter),
 * a selection readout and submit. `value` is the mood set currently shown
 * in the results; the bar keeps a draft until the user submits.
 */
export default function MoodBar({ value = [], onSubmit, busy = false }) {
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const valueKey = value.join(',');

  useEffect(() => {
    setDraft(valueKey ? valueKey.split(',') : []);
  }, [valueKey]);

  // Featured moods, plus any mood from the current search, lead the row.
  // Order only changes on submit, so chips never jump while tapping.
  const featured = useMemo(() => {
    const current = valueKey ? valueKey.split(',') : [];
    return [...current, ...FEATURED_MOODS.filter((m) => !current.includes(m))];
  }, [valueKey]);
  const rest = MOODS.filter((m) => !featured.includes(m) && filterMoods(deferredFilter).includes(m));
  const atLimit = draft.length >= MAX_MOODS;
  const unchanged = sameSet(draft, value);

  const toggle = (mood) =>
    setDraft((current) =>
      current.includes(mood) ? current.filter((m) => m !== mood) : current.length >= MAX_MOODS ? current : [...current, mood],
    );

  const submit = (e) => {
    e.preventDefault();
    if (draft.length && !unchanged) onSubmit(draft);
  };

  const chip = (mood) => (
    <MoodChip key={mood} mood={mood} active={draft.includes(mood)} disabled={!draft.includes(mood) && atLimit} onToggle={toggle} />
  );

  return (
    <form onSubmit={submit} role="search" aria-label="Find films by mood">
      <div
        role="group"
        aria-label="Moods"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {featured.map(chip)}
        {expanded && rest.map(chip)}
      </div>

      {expanded && (
        <div className="relative mt-3 max-w-xs">
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
            className="field h-9 rounded-full pl-9"
          />
          {deferredFilter && rest.length === 0 && <p className="mt-2 text-sm text-subtle">No other moods match “{filter}”.</p>}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={!draft.length || unchanged} loading={busy && unchanged}>
          Find films
        </Button>
        <span className="num text-sm text-subtle" aria-live="polite">
          {draft.length}/{MAX_MOODS}
          <span className="sr-only"> moods selected</span>
        </span>
        {draft.length > 0 && (
          <button type="button" onClick={() => setDraft([])} className="text-sm text-muted transition-colors hover:text-ink">
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="ml-auto inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          {expanded ? 'Fewer moods' : `More moods (${MOODS.length})`}
          <FiChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
