"use client";

import { useEffect } from "react";
import { useResume } from "./use-resume";
import { useTheme } from "./use-theme";
import { useCommandPalette } from "./use-command-palette";

/**
 * Global shortcuts, mounted once near the app root. Undo/redo are
 * resume-level (object state), not native browser text-field undo --
 * intentionally: this matches how design/editor tools (Figma, Notion)
 * handle Ctrl+Z, and is what the FRS asks for. Escape is deliberately
 * NOT handled here; each dialog/overlay owns its own Escape behavior.
 */
export function useKeyboardShortcuts() {
  const { undo, redo } = useResume();
  const { cycleTheme } = useTheme();
  const { toggle: toggleCommandPalette } = useCommandPalette();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === "k") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (key === "d") {
        e.preventDefault(); // otherwise the browser bookmarks the page
        cycleTheme();
        return;
      }

      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      if (key === "z") {
        e.preventDefault();
        undo();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, cycleTheme, toggleCommandPalette]);
}
