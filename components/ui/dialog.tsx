"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Skips the default solid panel skin + padding, so the caller can
   *  fully control the panel's appearance (e.g. a custom-branded card
   *  that should look the same regardless of the site's light/dark
   *  theme). Structural behavior (focus trap, escape, backdrop, portal,
   *  animation) is unchanged either way. */
  unstyled?: boolean;
  /** Hides the built-in close button, for a caller supplying its own
   *  (e.g. styled to match a custom-branded panel rather than the
   *  theme-token-based default, which wouldn't read correctly against
   *  a panel that's intentionally always-dark or always-light). */
  hideCloseButton?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  unstyled = false,
  hideCloseButton = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Basic focus trap: cycle Tab/Shift+Tab within the dialog's
      // focusable elements so background content is never reachable
      // while the dialog is open.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Focus the panel so Escape and Tab work immediately without a click.
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-background/75 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative w-full max-w-md rounded-dialog shadow-2xl outline-none",
              // Solid bg-popover, not glass-surface: this panel sits over
              // an already-blurred, translucent backdrop (see the
              // absolute div above) -- stacking a SECOND translucent
              // glass layer on top of that made the whole dialog read as
              // washed-out and low-contrast in both themes (worst in
              // light mode, where a cream-tinted glass panel over a
              // cream-tinted blurred backdrop nearly disappeared into
              // the page). A solid, fully opaque panel reads clearly
              // against the blurred backdrop in either theme.
              !unstyled && "bg-popover text-popover-foreground border border-glass-border p-6",
              className
            )}
          >
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-button text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
