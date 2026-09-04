"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { ToastMessage, ToastVariant } from "@/types/toast";
import { createId } from "@/lib/id";
import { cn } from "@/lib/utils";

interface ToastContextValue {
  showToast: (text: string, variant?: ToastVariant) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3500;
const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
};
const ICON_COLOR: Record<ToastVariant, string> = {
  default: "text-primary",
  success: "text-success",
  error: "text-error",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, variant: ToastVariant = "default") => {
      const id = createId();
      setToasts((prev) => [...prev, { id, text, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* aria-live region: screen readers announce new toasts without
          needing focus to move, per accessibility requirements. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-24 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.variant];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="glass-surface pointer-events-auto flex items-center gap-2.5 rounded-input px-4 py-3 shadow-xl"
              >
                <Icon size={16} className={cn("shrink-0", ICON_COLOR[toast.variant])} />
                <p className="flex-1 text-sm text-foreground">{toast.text}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
