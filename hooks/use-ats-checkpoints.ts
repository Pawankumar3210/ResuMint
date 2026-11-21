"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { AtsCheckpoint } from "@/types/ats";

const STORAGE_KEY = "resumint:ats-checkpoints:v1";
const EMPTY_CHECKPOINTS: Record<string, AtsCheckpoint> = {};

export function useAtsCheckpoints(resumeId: string) {
  const { value, setValue } = useLocalStorage<Record<string, AtsCheckpoint>>(
    STORAGE_KEY,
    EMPTY_CHECKPOINTS
  );

  const checkpoint = value[resumeId];

  const saveCheckpoint = useCallback(
    (next: AtsCheckpoint) => {
      if (!resumeId) return;
      setValue((previous) => ({ ...previous, [resumeId]: next }));
    },
    [resumeId, setValue]
  );

  const clearCheckpoint = useCallback(() => {
    if (!resumeId) return;
    setValue((previous) => {
      if (!(resumeId in previous)) return previous;
      const next = { ...previous };
      delete next[resumeId];
      return next;
    });
  }, [resumeId, setValue]);

  return { checkpoint, saveCheckpoint, clearCheckpoint };
}
