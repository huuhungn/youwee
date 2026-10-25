import { useCallback, useEffect, useId, useRef } from 'react';

/** Elements that can receive keyboard focus inside the dialog. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** True while the user is typing in a field, so a dialog that opens on its own leaves focus there. */
export function isTypingTarget(element: Element | null) {
  return (
    element instanceof HTMLElement &&
    (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName))
  );
}

interface ModalShellProps {
  /** Called when the user dismisses via Escape or the backdrop. */
  onDismiss: () => void;
  /** Accessible name; wire to the visible heading via `titleId`. */
  titleId: string;
  /** Optional accessible description id. */
  descriptionId?: string;
  /** Dialog panel content (already styled by the caller). */
  children: React.ReactNode;
  /** Set false for dialogs that must not close on Escape/backdrop. */
  dismissible?: boolean;
  /** Replaces the default overlay and panel styling. */
  overlayClassName?: string;
  className?: string;
}

/**
 * Accessible shell for the hand-built overlays.
 *
 * Provides the semantics a native dialog needs and these overlays lacked:
 * `role="dialog"` + `aria-modal`, an accessible name, Escape to close, a focus
 * trap, and focus restoration to the element that opened the dialog.
 */
export function ModalShell({
  onDismiss,
  titleId,
  descriptionId,
  children,
  dismissible = true,
  overlayClassName = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
  className = 'w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden outline-none',
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Remember the trigger so focus can be restored on close.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  // Move focus into the dialog once it opens, preferring an element marked data-autofocus.
  // A dialog that pops up while the user types must not swallow the rest of their input.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || isTypingTarget(document.activeElement)) return;
    const first =
      panel.querySelector<HTMLElement>('[data-autofocus]') ??
      panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? panel).focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onDismiss();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      // Wrap focus so Tab cannot escape into the page behind the overlay.
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [dismissible, onDismiss],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: overlay implements dialog keyboard semantics
    <div
      className={overlayClassName}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) {
          onDismiss();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={className}
      >
        {children}
      </div>
    </div>
  );
}

/** Stable ids for a dialog's title/description pair. */
export function useDialogIds() {
  const base = useId();
  return { titleId: `${base}-title`, descriptionId: `${base}-description` };
}
