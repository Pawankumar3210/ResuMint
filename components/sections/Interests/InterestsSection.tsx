"use client";

import { useResume } from "@/hooks/use-resume";
import { TagInput } from "@/components/ui/tag-input";

const COMMON_INTERESTS = ["Reading", "Photography", "Chess", "Music", "Sports", "Travel"];

export function InterestsSection() {
  const { resume, addInterest, removeInterest } = useResume();

  return (
    <TagInput
      label="Interests"
      placeholder="Type an interest and press Enter"
      items={resume.interests}
      onAdd={addInterest}
      onRemove={removeInterest}
      suggestions={COMMON_INTERESTS}
      optional
    />
  );
}
