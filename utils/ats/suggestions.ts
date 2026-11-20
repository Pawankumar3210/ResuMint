import type {
  AtsKeyword,
  AtsReadinessCheck,
  AtsSuggestion,
} from "@/types/ats";

function locationSummary(keyword: AtsKeyword): string {
  const sections = Array.from(
    new Set(keyword.locations.map((location) => location.sectionLabel))
  );
  if (sections.length === 0) return "";
  if (sections.length === 1) return sections[0];
  return `${sections.slice(0, -1).join(", ")} and ${sections[sections.length - 1]}`;
}

export function buildAtsSuggestions(
  keywords: AtsKeyword[],
  readiness: AtsReadinessCheck[]
): AtsSuggestion[] {
  const suggestions: AtsSuggestion[] = [];

  const criticalMissing = keywords.filter(
    (keyword) => keyword.priority === "critical" && keyword.coverage === "none"
  );
  const criticalWeak = keywords.filter(
    (keyword) =>
      keyword.priority === "critical" &&
      keyword.coverage !== "none" &&
      keyword.coverage !== "strong"
  );
  const related = keywords.filter(
    (keyword) =>
      keyword.match === "related" &&
      (keyword.priority === "critical" || keyword.priority === "preferred")
  );
  const preferredMissing = keywords.filter(
    (keyword) => keyword.priority === "preferred" && keyword.coverage === "none"
  );

  for (const keyword of criticalMissing.slice(0, 3)) {
    suggestions.push({
      id: `keyword-missing-${keyword.id}`,
      title: `Add evidence for ${keyword.label}`,
      detail: `The job description treats ${keyword.label} as a must-have, but it isn't visible in your resume. If you have real experience, add a concrete example under Experience or Projects. If not, consider whether this role is the right fit.`,
      tone: "critical",
      keywordLabel: keyword.label,
    });
  }

  for (const keyword of criticalWeak.slice(0, 2)) {
    suggestions.push({
      id: `keyword-context-${keyword.id}`,
      title: `Show ${keyword.label} in context`,
      detail:
        keyword.coverage === "skills"
          ? `${keyword.label} appears only in your Skills list. Add a truthful project or experience bullet showing what you built or solved with it.`
          : `${keyword.label} appears in ${locationSummary(keyword)}. Reinforce it with a specific experience or project example if you have one.`,
      tone: "improve",
      keywordLabel: keyword.label,
    });
  }

  const readinessIssues = [...readiness]
    .filter((check) => check.status !== "pass" && check.suggestion)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "fail" ? -1 : 1;
      return b.weight - a.weight;
    });

  for (const check of readinessIssues.slice(0, 3)) {
    suggestions.push({
      id: `readiness-${check.id}`,
      title: check.label,
      detail: check.suggestion ?? check.detail,
      tone: check.status === "fail" ? "critical" : "improve",
    });
  }

  for (const keyword of preferredMissing.slice(0, 2)) {
    suggestions.push({
      id: `keyword-preferred-${keyword.id}`,
      title: `Consider ${keyword.label}`,
      detail: `The job description lists ${keyword.label} as preferred. Add it only if you can support it with real experience or a project.`,
      tone: "tip",
      keywordLabel: keyword.label,
    });
  }

  for (const keyword of related.slice(0, 1)) {
    if (!keyword.matchedAlias) continue;
    suggestions.push({
      id: `keyword-wording-${keyword.id}`,
      title: `Align wording for ${keyword.label}`,
      detail: `Your resume uses “${keyword.matchedAlias}”, while the job description says “${keyword.label}”. Use the job description's wording where it is accurate.`,
      tone: "tip",
      keywordLabel: keyword.label,
    });
  }

  return suggestions.slice(0, 9);
}
