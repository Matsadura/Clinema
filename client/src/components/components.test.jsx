import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodBar from './MoodBar.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import MovieCard from './MovieCard.jsx';
import { MAX_MOODS, MOODS } from '../lib/moods.js';

describe('MoodBar', () => {
  it('requires a mood, then submits the selection', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodBar onSubmit={onSubmit} />);

    const submit = screen.getByRole('button', { name: 'Find films' });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Calm' }));
    await user.click(screen.getByRole('button', { name: 'Curious' }));
    expect(screen.getByRole('button', { name: 'Calm' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/2\/6/)).toBeInTheDocument();

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(['Calm', 'Curious']);
  });

  it('enforces the limit, filters, and clears', async () => {
    const user = userEvent.setup();
    render(<MoodBar onSubmit={vi.fn()} />);

    for (const mood of MOODS.slice(0, MAX_MOODS)) {
      await user.click(screen.getByRole('button', { name: mood }));
    }
    expect(screen.getByRole('button', { name: MOODS[MAX_MOODS] })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('button', { name: 'Find films' })).toBeDisabled();

    await user.type(screen.getByLabelText('Filter moods'), 'zzz');
    expect(screen.getByText(/No moods match/)).toBeInTheDocument();
  });

  it('starts from the current search, leads with it, and only submits changes', async () => {
    const user = userEvent.setup();
    render(<MoodBar value={['Sad', 'Calm']} onSubmit={vi.fn()} />);

    const pressed = screen.getAllByRole('button', { pressed: true });
    expect(pressed.map((c) => c.textContent)).toEqual(['Sad', 'Calm']);
    expect(screen.getByRole('group', { name: 'Moods' }).firstChild).toHaveTextContent('Sad');

    const submit = screen.getByRole('button', { name: 'Find films' });
    expect(submit).toBeDisabled(); // identical to what's already shown
    await user.click(screen.getByRole('button', { name: 'Tired' }));
    expect(submit).toBeEnabled();
  });

  it('uses no emoji in mood labels', () => {
    render(<MoodBar onSubmit={vi.fn()} />);
    const text = screen.getByRole('group', { name: 'Moods' }).textContent;
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('MovieCard', () => {
  const movie = { tmdb_id: 1, title: 'Heat', year: 1995, rating: 8.3, poster: null };

  it('shows only title, year and rating, and toggles without opening', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onOpen = vi.fn();
    render(<MovieCard movie={movie} liked onToggle={onToggle} onOpen={onOpen} />);

    expect(screen.getByRole('heading', { name: 'Heat' })).toBeInTheDocument();
    expect(screen.getByText(/8\.3/)).toHaveTextContent('8.3 out of 10');
    expect(screen.getByRole('button', { name: 'Unlike: Heat' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Add to watchlist: Heat' }));
    expect(onToggle).toHaveBeenCalledWith(movie, 'save');
    expect(onOpen).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Heat (1995), view details' }));
    expect(onOpen).toHaveBeenCalledWith(movie);
  });

  it('offers "not for me" and reflects dismissed films', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(<MovieCard movie={movie} onToggle={onToggle} />);
    await user.click(screen.getByRole('button', { name: 'Not for me: Heat' }));
    expect(onToggle).toHaveBeenCalledWith(movie, 'dislike');

    rerender(<MovieCard movie={movie} disliked onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Undo not for me: Heat' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ErrorBoundary', () => {
  it('shows a recovery screen instead of crashing', () => {
    const Boom = () => {
      throw new Error('kaboom');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    spy.mockRestore();
  });
});
