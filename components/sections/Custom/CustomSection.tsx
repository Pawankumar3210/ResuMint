"use client";

import { useResume } from "@/hooks/use-resume";
import type { CustomSection } from "@/types/resume";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";

/**
 * A single user-defined section (free-text title + free-text body). Named
 * `CustomSectionForm` (not `CustomSection`) to avoid colliding with the
 * `CustomSection` data-shape type imported elsewhere from types/resume.
 *
 * Shared by both custom-section slots (resume.custom / resume.custom2) --
 * `checkboxLabel` and `placeholder` are the only things that differ
 * between the two, so the actual field/updater pair and copy are passed
 * in rather than duplicating this whole form twice.
 */
function CustomSectionFormBase({
  section,
  onUpdate,
  checkboxLabel,
}: {
  section: CustomSection;
  onUpdate: (patch: Partial<CustomSection>) => void;
  checkboxLabel: string;
}) {
  const { enabled, title, body } = section;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="h-4 w-4 rounded accent-primary transition-transform"
        />
        {checkboxLabel}
      </label>

      <CollapsibleReveal show={enabled}>
        <Input
          label="Section Title"
          value={title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g. Publications, Volunteering, Hobbies"
        />
        <Textarea
          label="Section Content"
          value={body}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder="Write freely -- this appears as plain paragraph text under your title, exactly as typed."
          rows={5}
        />
      </CollapsibleReveal>
    </div>
  );
}

export function CustomSectionForm() {
  const { resume, updateCustomSection } = useResume();
  return (
    <CustomSectionFormBase
      section={resume.custom}
      onUpdate={updateCustomSection}
      checkboxLabel="Include a custom section on my resume"
    />
  );
}

export function CustomSectionForm2() {
  const { resume, updateCustomSection2 } = useResume();
  return (
    <CustomSectionFormBase
      section={resume.custom2}
      onUpdate={updateCustomSection2}
      checkboxLabel="Include a second custom section on my resume"
    />
  );
}
