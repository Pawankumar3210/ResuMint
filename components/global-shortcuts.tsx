"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { CommandPalette } from "./command-palette";

export function GlobalShortcuts() {
  useKeyboardShortcuts();
  return <CommandPalette />;
}
