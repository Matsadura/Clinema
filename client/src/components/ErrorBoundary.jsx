import { Component } from 'react';

/** Catches render errors so one broken component doesn't blank the app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Hook point for an error reporting service (Sentry, etc.)
    console.error('Unhandled UI error', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Reset when navigating to another page
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl" aria-hidden="true">🎞️</p>
        <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-white/60">
          An unexpected error broke this page. Reloading usually fixes it.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-5 py-2.5 font-semibold hover:bg-primary-light"
          >
            Reload page
          </button>
          <a href="/" className="rounded-xl bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/15">
            Go home
          </a>
        </div>
      </div>
    );
  }
}
