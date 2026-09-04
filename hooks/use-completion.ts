"use client";

import { useMemo } from "react";
import { useResume } from "./use-resume";
import { getAllSectionStatuses, getOverallCompletion } from "@/utils/resumeCompletion";

export function useCompletion() {
  const { resume } = useResume();

  const statuses = useMemo(() => getAllSectionStatuses(resume), [resume]);
  const percentage = useMemo(() => getOverallCompletion(resume), [resume]);

  return { statuses, percentage };
}
