"use client";

import { useContext } from "react";
import { ResumeContext } from "@/components/resume-provider";

export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) {
    throw new Error("useResume() must be used within a <ResumeProvider>.");
  }
  return ctx;
}
