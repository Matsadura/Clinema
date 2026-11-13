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
      <div role="alert" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <p className="label">Error</p>
        <h1 className="mt-3 font-display text-display text-ink">Something went wrong.</h1>
        <p className="mt-3 max-w-prose text-muted">An unexpected error broke this page. Reloading usually fixes it.</p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong"
          >
            Reload page
          </button>
          <a href="/" className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-muted transition-colors hover:text-ink">
            Go home
          </a>
        </div>
      </div>
    );
  }
}
