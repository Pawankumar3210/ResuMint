"use client";

import { useResume } from "@/hooks/use-resume";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";
import { MAX_SUMMARY_LENGTH } from "@/constants/resume-defaults";

export function ProfessionalSummarySection() {
  const { resume, updateSummary, setSummaryEnabled } = useResume();

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
        <input
          type="checkbox"
          checked={resume.summaryEnabled}
          onChange={(e) => setSummaryEnabled(e.target.checked)}
          className="h-4 w-4 rounded accent-primary transition-transform"
        />
        Include a professional summary on my resume
      </label>

      <CollapsibleReveal show={resume.summaryEnabled}>
        <Textarea
          label="Professional Summary"
          value={resume.summary.text}
          onChange={(e) => updateSummary(e.target.value.slice(0, MAX_SUMMARY_LENGTH))}
          maxLength={MAX_SUMMARY_LENGTH}
          rows={5}
          placeholder="Computer Science undergraduate with a strong foundation in full-stack development. Built 3 production-grade web apps used by 2k+ students. Seeking an SDE Intern role to ship impactful features."
        />
      </CollapsibleReveal>
    </div>
  );
}
