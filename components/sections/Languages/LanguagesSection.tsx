"use client";

import { useResume } from "@/hooks/use-resume";
import { TagInput } from "@/components/ui/tag-input";

const COMMON_LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Mandarin"];

export function LanguagesSection() {
  const { resume, addLanguage, removeLanguage } = useResume();

  return (
    <TagInput
      label="Languages"
      placeholder="Type a language and press Enter"
      items={resume.languages}
      onAdd={addLanguage}
      onRemove={removeLanguage}
      suggestions={COMMON_LANGUAGES}
      optional
    />
  );
}
