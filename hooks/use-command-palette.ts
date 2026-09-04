"use client";

import { useContext } from "react";
import { CommandPaletteContext } from "@/components/command-palette-provider";

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette() must be used within a <CommandPaletteProvider>.");
  return ctx;
}
