"use client";

import { createContext, useCallback, useRef } from "react";
import type { SectionId } from "@/types/resume";

export interface AppActions {
  openDownloadDialog?: () => void;
  openImportDialog?: () => void;
  requestClearResume?: () => void;
  loadDemoResume?: () => void;
  jumpToSection?: (id: SectionId) => void;
}

interface AppActionsContextValue {
  /** Register (or unregister with `undefined`) a named action. Returns
   *  nothing -- consumers read the latest registered actions via `get`. */
  register: <K extends keyof AppActions>(key: K, fn: AppActions[K] | undefined) => void;
  get: () => AppActions;
}

export const AppActionsContext = createContext<AppActionsContextValue | null>(null);

/**
 * A light imperative registry rather than reactive state: the Command
 * Palette and keyboard shortcuts only ever need the *current* handler at
 * the moment they're invoked (a click or keypress), not to re-render
 * whenever a handler identity changes. Using a ref avoids cascading
 * re-renders across the whole app every time any owning component
 * re-creates its callback.
 */
export function AppActionsProvider({ children }: { children: React.ReactNode }) {
  const actionsRef = useRef<AppActions>({});

  const register = useCallback(<K extends keyof AppActions>(key: K, fn: AppActions[K] | undefined) => {
    actionsRef.current = { ...actionsRef.current, [key]: fn };
  }, []);

  const get = useCallback(() => actionsRef.current, []);

  return (
    <AppActionsContext.Provider value={{ register, get }}>{children}</AppActionsContext.Provider>
  );
}
