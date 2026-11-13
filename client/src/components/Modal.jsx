import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

const PANELS = {
  // Centred dialog (confirmations)
  dialog:
    'relative m-4 w-full max-w-md animate-fade-in rounded-md border border-line/[0.08] bg-surface',
  // Detail drawer: right-hand panel on desktop, bottom sheet on mobile
  drawer:
    'absolute inset-x-0 bottom-0 max-h-[92vh] animate-sheet-up overflow-y-auto rounded-t-lg border-t border-line/[0.08] bg-surface ' +
    'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(560px,100vw)] sm:animate-slide-in sm:rounded-none sm:border-l sm:border-t-0',
};

/** Accessible modal: Escape/overlay close, focus trap and restore,
 *  background scroll lock. */
export default function Modal({ open, onClose, title, children, variant = 'dialog', hideTitle = false }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={`fixed inset-0 z-50 ${variant === 'dialog' ? 'flex items-center justify-center' : ''}`}>
      <div className="absolute inset-0 animate-fade-in bg-black/70" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`${PANELS[variant]} focus:outline-none`}>
        <div className={`flex items-start justify-between gap-4 ${hideTitle ? 'absolute right-0 top-0 z-10 p-3' : 'px-6 pt-6'}`}>
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'font-display text-display-sm text-ink'}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-canvas/80 text-muted transition-colors hover:text-ink"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
