"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Chip } from "./chip";

interface TagInputProps {
  label: string;
  placeholder?: string;
  items: { id: string; label: string }[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
  suggestions?: string[];
  optional?: boolean;
  showCount?: boolean;
}

/**
 * Type + Enter tag entry used by Skills and Languages.
 * Duplicate-safe (case-insensitive) and offers lightweight suggestions
 * for common values that haven't been added yet.
 */
export function TagInput({
  label,
  placeholder = "Type and press Enter",
  items,
  onAdd,
  onRemove,
  suggestions = [],
  optional,
  showCount,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const existingLabels = new Set(items.map((i) => i.label.toLowerCase()));
  const visibleSuggestions = suggestions
    .filter((s) => !existingLabels.has(s.toLowerCase()))
    .slice(0, 6);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (existingLabels.has(trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onAdd(trimmed);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-sm font-medium text-foreground">
          {label}
          {optional && <span className="ml-1.5 font-normal text-foreground-secondary">(optional)</span>}
        </label>
        {showCount && (
          <span className="text-xs tabular-nums text-foreground-secondary">
            {items.length} {items.length === 1 ? "tag" : "tags"}
          </span>
        )}
      </div>

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
        className="h-11 rounded-input border border-glass-border bg-transparent px-3.5 text-sm text-foreground
                   glass-surface placeholder:text-foreground-secondary/60
                   transition-colors duration-200
                   focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
      />

      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} added`}>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <li key={item.id}>
                <Chip label={item.label} onRemove={() => onRemove(item.id)} />
              </li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {visibleSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-xs text-foreground-secondary">Suggestions:</span>
          {visibleSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAdd(s)}
              className="rounded-chip border border-dashed border-glass-border px-2.5 py-1 text-xs text-foreground-secondary transition-colors hover:border-primary/50 hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
