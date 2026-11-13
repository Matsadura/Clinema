import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodPicker from './MoodPicker.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import MovieCard from './MovieCard.jsx';
import { MAX_MOODS, MOODS } from '../lib/moods.js';

describe('MoodPicker', () => {
  it('requires a mood, then submits the selection', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MoodPicker onSubmit={onSubmit} hasLocation onRequestLocation={vi.fn()} />);

    const submit = screen.getByRole('button', { name: 'Match my mood' });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Calm/ }));
    await user.click(screen.getByRole('button', { name: /Curious/ }));
    expect(screen.getByRole('button', { name: /Calm/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Mood + weather' }));
    expect(onSubmit).toHaveBeenCalledWith({ moods: ['Calm', 'Curious'], withWeather: true });
  });

  it('filters moods by search and enforces the selection limit', async () => {
    const user = userEvent.setup();
    render(<MoodPicker onSubmit={vi.fn()} hasLocation={false} onRequestLocation={vi.fn()} />);

    for (const mood of MOODS.slice(0, MAX_MOODS)) {
      await user.click(screen.getByRole('button', { name: mood.name }));
    }
    expect(screen.getByText(`${MAX_MOODS} selected (max ${MAX_MOODS})`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: MOODS[MAX_MOODS].name })).toBeDisabled();

    await user.type(screen.getByLabelText('Search moods'), 'zzz');
    expect(screen.getByText(/No moods match/)).toBeInTheDocument();
  });

  it('offers to add location when it is not available', async () => {
    const user = userEvent.setup();
    const onRequestLocation = vi.fn();
    render(<MoodPicker onSubmit={vi.fn()} hasLocation={false} onRequestLocation={onRequestLocation} />);
    await user.click(screen.getByRole('button', { name: 'Add my weather too' }));
    expect(onRequestLocation).toHaveBeenCalled();
  });
});

describe('MovieCard', () => {
  const movie = { tmdb_id: 1, title: 'Heat', year: 1995, rating: 8.3, poster: null };

  it('renders details and toggles flags without opening the card', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onOpen = vi.fn();
    render(<MovieCard movie={movie} liked onToggle={onToggle} onOpen={onOpen} />);

    expect(screen.getByText('1995')).toBeInTheDocument();
    expect(screen.getByText('8.3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlike Heat' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Save Heat to watchlist' }));
    expect(onToggle).toHaveBeenCalledWith(movie, 'save');
    expect(onOpen).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Heat \(1995\)/ }));
    expect(onOpen).toHaveBeenCalledWith(movie);
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
