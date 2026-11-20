import type {
  AtsCoverage,
  AtsKeywordLocation,
  AtsMatchType,
  AtsSection,
} from "@/types/ats";
import type { Resume, SkillCategory } from "@/types/resume";
import {
  AMBIGUOUS_ALIASES,
  TECH_CONTEXT_RE,
  hasOtherTechnicalTerm,
  isAmbiguousFalsePositive,
  sentenceBounds,
} from "./context";
import { findTermSpans, makeSnippet, normalizeSearch } from "./normalize";

export interface ResumeEvidenceSegment {
  section: AtsSection;
  sectionLabel: string;
  entryLabel?: string;
  text: string;
  coverage: Exclude<AtsCoverage, "none">;
}

export interface ResumeKeywordMatch {
  match: AtsMatchType;
  matchedAlias?: string;
  coverage: AtsCoverage;
  locations: AtsKeywordLocation[];
}

const SECTION_LABELS: Record<AtsSection, string> = {
  summary: "Professional Summary",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
  languages: "Languages",
  custom: "Custom Section",
};

const COVERAGE_RANK: Record<AtsCoverage, number> = {
  none: 0,
  skills: 1,
  supporting: 2,
  strong: 3,
};

function joinFields(parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(". ");
}

export function buildResumeEvidence(resume: Resume): ResumeEvidenceSegment[] {
  const segments: ResumeEvidenceSegment[] = [];
  const add = (
    section: AtsSection,
    text: string,
    coverage: Exclude<AtsCoverage, "none">,
    entryLabel?: string
  ) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    segments.push({
      section,
      sectionLabel: SECTION_LABELS[section],
      entryLabel,
      text: clean,
      coverage,
    });
  };

  if (resume.summaryEnabled) add("summary", resume.summary.text, "strong");

  for (const entry of resume.experience) {
    const label = [entry.role, entry.organization].filter(Boolean).join(" · ");
    add(
      "experience",
      joinFields([entry.role, entry.organization, entry.type, entry.description]),
      "strong",
      label || "Experience"
    );
  }

  for (const project of resume.projects) {
    add(
      "projects",
      joinFields([project.name, project.techStack, project.description]),
      "strong",
      project.name || "Project"
    );
  }

  const categoryLabels = new Map<string, string>();
  for (const category of resume.skillCategories ?? []) {
    categoryLabels.set(category.id, category.label);
  }

  for (const skill of resume.skills) {
    add(
      "skills",
      skill.label,
      "skills",
      categoryLabels.get(skill.category as SkillCategory) ?? "Skills"
    );
  }

  if (resume.educationEnabled) {
    for (const entry of resume.education) {
      add(
        "education",
        joinFields([entry.degree, entry.branch, entry.institution, entry.grade]),
        "supporting",
        entry.institution || "Education"
      );
    }
  }

  if (resume.certificationsEnabled) {
    for (const certification of resume.certifications) {
      add(
        "certifications",
        joinFields([certification.name, certification.organization]),
        "supporting",
        certification.name || "Certification"
      );
    }
  }

  if (resume.achievementsEnabled) {
    for (const achievement of resume.achievements) {
      add(
        "achievements",
        achievement.text,
        "supporting",
        "Achievement"
      );
    }
  }

  if (resume.languagesEnabled) {
    for (const language of resume.languages) {
      add("languages", language.label, "supporting", "Language");
    }
  }

  for (const custom of [resume.custom, resume.custom2, resume.custom3]) {
    if (!custom.enabled) continue;
    add(
      "custom",
      joinFields([custom.title, custom.body]),
      "supporting",
      custom.title || "Custom Section"
    );
  }

  return segments;
}

function findPlausibleSpans(
  segment: ResumeEvidenceSegment,
  normalized: string,
  term: string,
  allTerms: string[]
): ReturnType<typeof findTermSpans> {
  const spans = findTermSpans(normalized, term);
  const normalizedTerm = normalizeSearch(term);

  if (!AMBIGUOUS_ALIASES.has(normalizedTerm)) return spans;
  if (segment.coverage === "skills") return spans;
  if (normalized === normalizedTerm) return spans;

  return spans.filter((span) => {
    const { start, end } = sentenceBounds(normalized, span.start);
    const sentence = normalized.slice(start, end).trim();
    const sentenceTerm = sentence.replace(/[.!?;]+$/, "").trim();

    if (sentenceTerm === normalizedTerm) return true;
    if (isAmbiguousFalsePositive(normalizedTerm, sentence)) return false;
    if (TECH_CONTEXT_RE.test(sentence)) return true;
    return hasOtherTechnicalTerm(sentence, allTerms);
  });
}

export function matchKeywordInResume(
  label: string,
  aliases: string[],
  segments: ResumeEvidenceSegment[]
): ResumeKeywordMatch {
  const canonical = normalizeSearch(label);
  const otherAliases = aliases.filter(
    (alias) => normalizeSearch(alias) !== canonical
  );
  const allTerms = [label, ...otherAliases];

  let hasExact = false;
  let relatedAlias: string | undefined;
  let coverage: AtsCoverage = "none";
  const locations: AtsKeywordLocation[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const normalized = normalizeSearch(segment.text);
    const exact =
      findPlausibleSpans(segment, normalized, label, allTerms).length > 0;
    const alias = exact
      ? undefined
      : otherAliases.find(
          (candidate) =>
            findPlausibleSpans(segment, normalized, candidate, allTerms)
              .length > 0
        );

    if (!exact && !alias) continue;

    if (exact) hasExact = true;
    if (!exact && alias && !relatedAlias) relatedAlias = alias;

    if (COVERAGE_RANK[segment.coverage] > COVERAGE_RANK[coverage]) {
      coverage = segment.coverage;
    }

    const locationKey = `${segment.section}|${segment.entryLabel ?? ""}|${segment.text}`;
    if (!seen.has(locationKey)) {
      seen.add(locationKey);
      locations.push({
        section: segment.section,
        sectionLabel: segment.sectionLabel,
        entryLabel: segment.entryLabel,
        snippet: makeSnippet(segment.text, allTerms),
        match: exact ? "exact" : "related",
        coverage: segment.coverage,
      });
    }
  }

  return {
    match: hasExact ? "exact" : relatedAlias ? "related" : "none",
    matchedAlias: hasExact ? undefined : relatedAlias,
    coverage,
    locations: locations
      .sort(
        (a, b) =>
          COVERAGE_RANK[b.coverage] - COVERAGE_RANK[a.coverage]
      )
      .slice(0, 8),
  };
}
