"use client";

import { useMemo } from "react";
import { useResume } from "./use-resume";
import { getResumeHealth } from "@/utils/resumeHealth";

export function useResumeHealth() {
  const { resume } = useResume();
  return useMemo(() => getResumeHealth(resume), [resume]);
}
