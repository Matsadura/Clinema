import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IoClose } from 'react-icons/io5';

/** Accessible modal dialog: Escape/overlay to close, focus management,
 *  and background scroll lock. */
export default function Modal({ open, onClose, title, children, size = 'md', hideTitle = false }) {
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
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative max-h-[92vh] w-full ${widths[size]} animate-fade-in overflow-y-auto rounded-t-3xl border border-white/10 bg-secondary shadow-2xl focus:outline-none sm:rounded-3xl`}
      >
        <div className={`flex items-center justify-between gap-4 px-6 pt-5 ${hideTitle ? 'absolute right-0 top-0 z-10' : ''}`}>
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'text-xl font-bold'}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white"
            aria-label="Close dialog"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
