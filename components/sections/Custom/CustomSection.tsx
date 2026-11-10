"use client";

import { motion } from "framer-motion";
import { PanelLeft, PanelRight } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import type { CustomSection } from "@/types/resume";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";
import { cn } from "@/lib/utils";

/**
 * A single user-defined section (free-text title + free-text body). Named
 * `CustomSectionForm` (not `CustomSection`) to avoid colliding with the
 * `CustomSection` data-shape type imported elsewhere from types/resume.
 *
 * Shared by all three custom-section slots (resume.custom / resume.custom2 / resume.custom3) --
 * `checkboxLabel` and `placeholder` are the only things that differ
 * between them, so the actual field/updater pair and copy are passed
 * in rather than duplicating this whole form three times.
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
  const { enabled, title, body, column } = section;

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
        <div className="flex flex-col gap-4">
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

          {/* Modern Template Column placement: Left (Sidebar) vs Right (Main) */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs font-medium text-foreground">
                Modern Layout Column
              </span>
              <span className="text-[11px] text-foreground-secondary">
                (Modern two-column layout only)
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Modern layout column"
              className="relative flex rounded-full border border-glass-border bg-muted/40 p-0.5 text-xs font-medium shadow-2xs"
            >
              <button
                type="button"
                role="radio"
                aria-checked={column === "left"}
                onClick={() => onUpdate({ column: "left" })}
                className={cn(
                  "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 px-3 text-xs font-medium transition-colors duration-200",
                  column === "left"
                    ? "text-primary-foreground font-semibold"
                    : "text-foreground-secondary hover:text-foreground"
                )}
              >
                {column === "left" && (
                  <motion.span
                    layoutId={`custom-col-pill-${checkboxLabel}`}
                    className="absolute inset-0 rounded-full bg-primary shadow-xs"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <PanelLeft size={13} />
                  Left Section (Sidebar)
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={column !== "left"}
                onClick={() => onUpdate({ column: "right" })}
                className={cn(
                  "relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 px-3 text-xs font-medium transition-colors duration-200",
                  column !== "left"
                    ? "text-primary-foreground font-semibold"
                    : "text-foreground-secondary hover:text-foreground"
                )}
              >
                {column !== "left" && (
                  <motion.span
                    layoutId={`custom-col-pill-${checkboxLabel}`}
                    className="absolute inset-0 rounded-full bg-primary shadow-xs"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <PanelRight size={13} />
                  Right Section (Main)
                </span>
              </button>
            </div>
            <p className="text-[11px] text-foreground-secondary/80">
              {column === "left"
                ? "Positioned in the left sidebar alongside Education, Skills, and Certifications."
                : "Positioned in the right main column alongside Experience and Projects."}
            </p>
          </div>
        </div>
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

export function CustomSectionForm3() {
  const { resume, updateCustomSection3 } = useResume();
  return (
    <CustomSectionFormBase
      section={resume.custom3}
      onUpdate={updateCustomSection3}
      checkboxLabel="Include a third custom section on my resume"
    />
  );
}
