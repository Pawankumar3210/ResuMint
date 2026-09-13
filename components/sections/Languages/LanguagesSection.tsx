"use client";

import { useResume } from "@/hooks/use-resume";
import { TagInput } from "@/components/ui/tag-input";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";

const COMMON_LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Mandarin"];

export function LanguagesSection() {
  const { resume, addLanguage, removeLanguage, setLanguagesEnabled } = useResume();

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
        <input
          type="checkbox"
          checked={resume.languagesEnabled}
          onChange={(e) => setLanguagesEnabled(e.target.checked)}
          className="h-4 w-4 rounded accent-primary transition-transform"
        />
        Include a languages section on my resume
      </label>

      <CollapsibleReveal show={resume.languagesEnabled}>
        <TagInput
          label="Languages"
          placeholder="Type a language and press Enter"
          items={resume.languages}
          onAdd={addLanguage}
          onRemove={removeLanguage}
          suggestions={COMMON_LANGUAGES}
          optional
        />
      </CollapsibleReveal>
    </div>
  );
}
