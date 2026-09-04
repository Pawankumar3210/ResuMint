"use client";

import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";

export function EntryCard({
  title,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  children,
}: {
  title: string;
  onRemove: () => void;
  /** Omit to hide the duplicate button entirely. */
  onDuplicate?: () => void;
  /** Omit either to hide reorder controls entirely (e.g. a list that
   *  will never have more than one entry). */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children: React.ReactNode;
}) {
  const showReorder = !!onMoveUp && !!onMoveDown;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-input border border-glass-border bg-muted/40 p-4 transition-colors duration-300 hover:border-primary/30"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-foreground-secondary">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {showReorder && (
            <>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                aria-label={`Move ${title} up`}
                className="flex h-7 w-7 items-center justify-center rounded-button text-foreground-secondary
                           transition-colors hover:bg-muted hover:text-foreground
                           disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                aria-label={`Move ${title} down`}
                className="flex h-7 w-7 items-center justify-center rounded-button text-foreground-secondary
                           transition-colors hover:bg-muted hover:text-foreground
                           disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
            </>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              aria-label={`Duplicate ${title}`}
              className="flex h-7 w-7 items-center justify-center rounded-button text-foreground-secondary
                         transition-colors hover:bg-muted hover:text-foreground"
            >
              <Copy size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${title}`}
            className="flex h-7 w-7 items-center justify-center rounded-button text-foreground-secondary transition-colors hover:bg-error/15 hover:text-error"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </motion.div>
  );
}
