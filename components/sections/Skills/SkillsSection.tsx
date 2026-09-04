"use client";

import { useResume } from "@/hooks/use-resume";
import { TagInput } from "@/components/ui/tag-input";
import { SKILL_CATEGORIES, type SkillCategory } from "@/types/resume";
import { SKILL_CATEGORY_META } from "@/constants/resume-defaults";

export function SkillsSection() {
  const { resume, addSkill, removeSkill } = useResume();

  return (
    <div className="flex flex-col gap-6">
      {SKILL_CATEGORIES.map((category: SkillCategory) => {
        const meta = SKILL_CATEGORY_META[category];
        return (
          <TagInput
            key={category}
            label={meta.label}
            placeholder={meta.placeholder}
            items={resume.skills.filter((s) => s.category === category)}
            onAdd={(label) => addSkill(label, category)}
            onRemove={removeSkill}
            suggestions={meta.suggestions}
            showCount
          />
        );
      })}
    </div>
  );
}
