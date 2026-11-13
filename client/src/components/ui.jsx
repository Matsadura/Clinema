// Small shared UI primitives.
import { FiAlertTriangle, FiInfo, FiRefreshCw } from 'react-icons/fi';

const BUTTON_VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-light focus-visible:ring-primary-light',
  secondary: 'bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/40',
  outline: 'border border-white/20 text-white hover:border-primary hover:text-primary-light focus-visible:ring-primary',
  ghost: 'text-white/80 hover:text-white hover:bg-white/5 focus-visible:ring-white/30',
  danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400',
};

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm sm:text-base', lg: 'px-6 py-3 text-base' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary-dark
        disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-6 w-6', label }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center">
      <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function Alert({ tone = 'error', title, children, onRetry, className = '' }) {
  const tones = {
    error: 'border-red-400/30 bg-red-500/10 text-red-100',
    warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    info: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
  };
  const Icon = tone === 'info' ? FiInfo : FiAlertTriangle;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 text-sm ${tones[tone]} ${className}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-1 opacity-90' : ''}>{children}</div>}
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20"
        >
          <FiRefreshCw aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-white/5 text-2xl text-primary-light">
          <Icon aria-hidden="true" />
        </span>
      )}
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <p className="mt-2 text-sm text-white/60">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white/5 ${className}`} aria-hidden="true">
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function PageSpinner({ label = 'Loading' }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-primary-light">
      <Spinner className="h-8 w-8" label={label} />
    </div>
  );
}
