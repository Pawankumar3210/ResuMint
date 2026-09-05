"use client";

import { useCallback, useRef, useState } from "react";
import { useResume } from "./use-resume";
import { EMPTY_RESUME } from "@/constants/resume-defaults";
import { DEMO_RESUME } from "@/constants/demo-resume";
import type { Resume } from "@/types/resume";
import { demoLoadState } from "@/lib/programmatic-load-state";

// The order sections "fill in" on screen -- reads top-to-bottom the same
// way the resume paper itself is laid out, so it feels like the resume is
// being written in front of you rather than appearing all at once.
const FILL_ORDER: (keyof Resume)[] = [
  "personal",
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "achievements",
  "leadership",
  "languages",
  "interests",
  "declaration",
  "custom",
];

const STEP_DELAY_MS = 120;

export { demoLoadState };

export function useDemoResume() {
  const { setResume } = useResume();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const cancelRef = useRef(false);

  const loadDemoResume = useCallback(async () => {
    cancelRef.current = false;
    setIsLoadingDemo(true);
    demoLoadState.active = true;

    try {
      let building: Resume = { ...EMPTY_RESUME };
      setResume(building);

      for (const key of FILL_ORDER) {
        if (cancelRef.current) return;
        // Intentional: this IS the staged reveal, each step must paint
        // before the next begins, so awaiting sequentially is correct here.
        await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));
        building = { ...building, [key]: DEMO_RESUME[key] };
        setResume(building);
      }
    } finally {
      // One more tick so BuilderHeader's percentage-watching effect
      // (triggered by the final setResume above) has already run and
      // observed demoLoadState.active === true before we clear it.
      await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS));
      demoLoadState.active = false;
      setIsLoadingDemo(false);
    }
  }, [setResume]);

  return { loadDemoResume, isLoadingDemo };
}
