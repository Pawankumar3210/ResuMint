"use client";

import { useCallback, useMemo, useState } from "react";
import type { Resume } from "@/types/resume";
import { analyzeResumeAgainstJob } from "@/utils/ats/analyze";

export const MIN_ATS_JOB_DESCRIPTION_LENGTH = 40;

export function useAtsAnalysis(resume: Resume, active = true) {
  const [jobDescription, setJobDescriptionState] = useState("");
  const [submittedJobDescription, setSubmittedJobDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentJobDescription = jobDescription.trim();

  const analysis = useMemo(
    () =>
      active && submittedJobDescription
        ? analyzeResumeAgainstJob(resume, submittedJobDescription)
        : null,
    [active, resume, submittedJobDescription]
  );

  const setJobDescription = useCallback((value: string) => {
    setJobDescriptionState(value);
    setError(null);
  }, []);

  const analyze = useCallback(() => {
    if (currentJobDescription.length < MIN_ATS_JOB_DESCRIPTION_LENGTH) {
      setError(
        `Paste at least ${MIN_ATS_JOB_DESCRIPTION_LENGTH} characters of the job description.`
      );
      return false;
    }

    setError(null);
    setSubmittedJobDescription(currentJobDescription);
    return true;
  }, [currentJobDescription]);

  const clear = useCallback(() => {
    setJobDescriptionState("");
    setSubmittedJobDescription(null);
    setError(null);
  }, []);

  return {
    jobDescription,
    submittedJobDescription,
    setJobDescription,
    analysis,
    analyze,
    clear,
    error,
    isStale:
      submittedJobDescription !== null &&
      submittedJobDescription !== currentJobDescription,
    minJobDescriptionLength: MIN_ATS_JOB_DESCRIPTION_LENGTH,
  };
}
