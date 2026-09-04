"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const ICONS = { dark: Moon, light: Sun } as const;
const LABELS = { dark: "Dark theme", light: "Light theme" } as const;

/**
 * Single icon button toggling Dark <-> Light. Also triggerable via the
 * global Ctrl+D shortcut (useKeyboardShortcuts). Only two themes are
 * offered by design -- no system-preference option.
 */
export function ThemeToggle() {
  const { theme, cycleTheme, mounted } = useTheme();

  // Avoid rendering theme-dependent icon before hydration to prevent mismatch.
  const activeTheme = mounted ? theme : "dark";
  const Icon = ICONS[activeTheme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Switch to ${activeTheme === "dark" ? "light" : "dark"} theme`}
      title={LABELS[activeTheme]}
      className="toggle-interactive relative flex h-10 w-10 items-center justify-center rounded-button
                 glass-surface text-foreground-secondary transition-colors duration-200
                 hover:text-foreground hover:border-primary/40 hover:shadow-[0_0_16px_color-mix(in_srgb,var(--color-primary)_45%,transparent)]"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={activeTheme}
          initial={{ opacity: 0, rotate: -180, scale: 0.4 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 180, scale: 0.4 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex items-center justify-center"
        >
          <Icon size={18} strokeWidth={1.75} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
