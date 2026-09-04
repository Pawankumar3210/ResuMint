"use client";

import { useResume } from "@/hooks/use-resume";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";

/**
 * A single user-defined section (free-text title + free-text body). Named
 * `CustomSectionForm` (not `CustomSection`) to avoid colliding with the
 * `CustomSection` data-shape type imported elsewhere from types/resume.
 */
export function CustomSectionForm() {
  const { resume, updateCustomSection } = useResume();
  const { enabled, title, body } = resume.custom;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => updateCustomSection({ enabled: e.target.checked })}
          className="h-4 w-4 rounded accent-primary transition-transform"
        />
        Include a custom section on my resume
      </label>

      <CollapsibleReveal show={enabled}>
        <Input
          label="Section Title"
          value={title}
          onChange={(e) => updateCustomSection({ title: e.target.value })}
          placeholder="e.g. Publications, Volunteering, Hobbies"
        />
        <Textarea
          label="Section Content"
          value={body}
          onChange={(e) => updateCustomSection({ body: e.target.value })}
          placeholder="Write freely -- this appears as plain paragraph text under your title, exactly as typed."
          rows={5}
        />
      </CollapsibleReveal>
    </div>
  );
}
