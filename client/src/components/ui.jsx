// Shared UI primitives. Visual language: hairline borders instead of shadows,
// 6px radii, one amber accent, 150–200ms ease-out transitions.
import { FiRotateCw } from 'react-icons/fi';

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong',
  secondary: 'border border-line/[0.14] bg-surface text-ink hover:bg-surface-hover',
  ghost: 'text-muted hover:bg-surface hover:text-ink',
  danger: 'border border-dislike/40 text-dislike hover:bg-dislike/10',
};
const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 ease-out
        disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-5 w-5', label }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center">
      <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path fill="currentColor" d="M12 2a10 10 0 0110 10h-3a7 7 0 00-7-7V2z" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/**
 * Inline notice: a hairline rule and plain text rather than a boxed,
 * iconified alert. `tone` is 'error' or 'info'.
 */
export function Alert({ tone = 'error', title, children, onRetry, className = '' }) {
  const rule = tone === 'error' ? 'border-dislike' : 'border-line/20';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-l-2 py-1 pl-4 text-sm ${rule} ${className}`}
    >
      <div className="max-w-prose">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && <div className="text-muted">{children}</div>}
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          <FiRotateCw aria-hidden="true" /> Try again
        </Button>
      )}
    </div>
  );
}

/** Quiet empty state: a serif line, one sentence, one action. */
export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-start gap-3 border-t border-line/[0.08] py-12">
      <h3 className="font-display text-display-sm text-ink">{title}</h3>
      {children && <p className="max-w-prose text-sm text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded bg-surface ${className}`} aria-hidden="true">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-line/[0.04] to-transparent" />
    </div>
  );
}

export function PageSpinner({ label = 'Loading' }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-subtle">
      <Spinner className="h-6 w-6" label={label} />
    </div>
  );
}

/** Text-style link button used for secondary inline actions. */
export const textLink =
  'font-medium text-ink underline decoration-line/30 underline-offset-4 transition-colors duration-150 hover:decoration-accent';
