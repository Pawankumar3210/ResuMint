"use client";

import { useContext, useEffect } from "react";
import { AppActionsContext, type AppActions } from "@/components/app-actions-provider";

/** Registers a single named action for the lifetime of the calling component. */
export function useRegisterAppAction<K extends keyof AppActions>(key: K, fn: AppActions[K]) {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error("useRegisterAppAction() must be used within an <AppActionsProvider>.");

  // Deliberately no dependency array: `fn` is typically a fresh closure
  // every render (it closes over local component state), so re-registering
  // each render keeps the palette/shortcuts calling the latest handler
  // rather than a stale one. `ctx` and `key` are stable across renders.
  useEffect(() => {
    ctx.register(key, fn);
    return () => ctx.register(key, undefined);
  });
}

/** Reads the current registry to invoke actions imperatively (Command Palette, shortcuts). */
export function useAppActions() {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error("useAppActions() must be used within an <AppActionsProvider>.");
  return ctx.get;
}
