"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * SSR-safe localStorage-backed state. Reads happen only after mount (Next.js
 * renders the same `initialValue` on the server and first client paint to
 * avoid hydration mismatches), then syncs to localStorage on every change.
 *
 * `merge`, when provided, runs once on the value freshly loaded from
 * localStorage (not on `initialValue` itself, and not again afterward) --
 * it's how a caller backfills fields that didn't exist yet when an older
 * version of the app last saved this key, rather than trusting the raw
 * parsed JSON to already match the current shape.
 */
export function useLocalStorage<T>(key: string, initialValue: T, merge?: (loaded: unknown, fallback: T) => T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // This IS the sync-from-external-system case the rule asks for:
    // localStorage only exists client-side, so it must be read after mount.
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(merge ? merge(parsed, initialValue) : (parsed as T));
      }
    } catch {
      // Corrupt or inaccessible storage -- fall back to initialValue silently.
    } finally {
      setHydrated(true);
    }
  }, [key, merge, initialValue]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable (e.g. private browsing) -- fail silently,
      // per privacy-first spec we never want this to interrupt typing.
    }
  }, [key, value, hydrated]);

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }, [key]);

  return { value, setValue, remove, hydrated } as const;
}
