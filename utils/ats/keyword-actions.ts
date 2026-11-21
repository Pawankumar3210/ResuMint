import type { AtsKeyword, AtsKeywordCategory } from "@/types/ats";
import type { Resume, SkillCategory } from "@/types/resume";
import { normalizeSearch } from "./normalize";

const SKILL_CATEGORY_MAP: Partial<
  Record<AtsKeywordCategory, SkillCategory>
> = {
  language: "languages",
  framework: "frameworks",
  database: "tools",
  cloud: "tools",
  tool: "tools",
  data: "tools",
  concept: "other",
  methodology: "other",
  other: "other",
};

export function skillCategoryForKeyword(
  category: AtsKeywordCategory
): SkillCategory | null {
  return SKILL_CATEGORY_MAP[category] ?? null;
}

export function canAddKeywordToSkills(
  keyword: AtsKeyword,
  resume: Resume
): boolean {
  if (keyword.coverage !== "none") return false;
  if (!skillCategoryForKeyword(keyword.category)) return false;

  const label = normalizeSearch(keyword.label);
  return !resume.skills.some(
    (skill) => normalizeSearch(skill.label) === label
  );
}
