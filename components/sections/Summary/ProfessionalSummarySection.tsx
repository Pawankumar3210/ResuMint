"use client";

import { useResume } from "@/hooks/use-resume";
import { Textarea } from "@/components/ui/textarea";
import { MAX_SUMMARY_LENGTH } from "@/constants/resume-defaults";

export function ProfessionalSummarySection() {
  const { resume, updateSummary } = useResume();

  return (
    <Textarea
      label="Professional Summary"
      value={resume.summary.text}
      onChange={(e) => updateSummary(e.target.value.slice(0, MAX_SUMMARY_LENGTH))}
      maxLength={MAX_SUMMARY_LENGTH}
      rows={5}
      placeholder="Computer Science undergraduate with a strong foundation in full-stack development. Built 3 production-grade web apps used by 2k+ students. Seeking an SDE Intern role to ship impactful features."
    />
  );
}
