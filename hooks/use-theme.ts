"use client";

import { useTheme as useNextTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { ThemeMode } from "@/types/theme";

/**
 * Wraps next-themes with our own ThemeMode vocabulary and guards against
 * hydration mismatches (theme is only knowable client-side). Only two
 * themes exist -- Dark and Light -- so this is a straight toggle.
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  // Canonical client-mount guard; no external system to subscribe to here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    const current = (theme as ThemeMode) ?? "dark";
    setTheme(current === "dark" ? "light" : "dark");
  };

  return {
    theme: (theme as ThemeMode) ?? "dark",
    resolvedTheme: mounted ? (resolvedTheme as ThemeMode) : "dark",
    setTheme: (mode: ThemeMode) => setTheme(mode),
    cycleTheme,
    mounted,
  };
}
