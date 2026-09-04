"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";

/**
 * Opens the same CommandPalette that Ctrl/Cmd+K already triggers (see
 * useKeyboardShortcuts) -- this is just a discoverable, always-visible
 * way to reach it for people who don't know the shortcut yet, or are on
 * a touch device with no keyboard at all.
 */
export function SearchTrigger() {
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search tools"
      className="toggle-interactive glass-surface flex items-center gap-2 rounded-chip
                 border border-glass-border px-2.5 py-2 text-sm text-foreground-secondary
                 transition-colors duration-200 hover:border-primary/40 hover:text-foreground sm:px-3.5"
    >
      <Search size={15} className="shrink-0" />
      <span className="hidden sm:inline">Search tools</span>
      <kbd
        className="hidden items-center gap-0.5 rounded border border-glass-border
                   px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary sm:inline-flex"
      >
        Ctrl&nbsp;+&nbsp;K
      </kbd>
    </button>
  );
}
