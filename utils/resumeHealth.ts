import type { Resume } from "@/types/resume";
import { getSectionStatus } from "./resumeCompletion";

export interface HealthCheck {
  id: string;
  label: string;
  status: "pass" | "warn";
  suggestion?: string;
}

const ACTION_VERBS = [
  "led", "built", "created", "designed", "developed", "implemented",
  "improved", "increased", "reduced", "launched", "managed", "organized",
  "achieved", "delivered", "optimized", "automated", "analyzed", "solved",
  "spearheaded", "collaborated", "mentored", "researched", "engineered",
];

function startsWithActionVerb(text: string): boolean {
  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
  return !!firstWord && ACTION_VERBS.includes(firstWord);
}

function containsMetric(text: string): boolean {
  return /\d/.test(text);
}

/**
 * Resume Health is intentionally lightweight and fast -- a handful of
 * pattern-level heuristics, not a deep NLP analysis. This is a distinct
 * concept from Resume Completion (utils/resumeCompletion.ts): completion
 * asks "did you fill this in", health asks "is what you filled in good".
 */
export function getResumeHealth(resume: Resume): { score: number; checks: HealthCheck[] } {
  const checks: HealthCheck[] = [];

  // ATS Compatibility -- always true for ResuMint's single-column,
  // no-table, no-image template, but stated explicitly so users see it.
  checks.push({ id: "ats", label: "ATS Compatible", status: "pass" });

  // Formatting -- flags entries missing their primary identifying field.
  const incompleteEntries =
    resume.education.some((e) => !e.institution.trim()) ||
    resume.experience.some((e) => !e.organization.trim() || !e.role.trim()) ||
    resume.projects.some((p) => !p.name.trim());
  checks.push({
    id: "formatting",
    label: "Good Formatting",
    status: incompleteEntries ? "warn" : "pass",
    suggestion: incompleteEntries ? "Fill in the missing fields on your entries." : undefined,
  });

  // Length -- rough word-count heuristic for "fits comfortably on 1-2 pages".
  const wordCount = [
    resume.summary.text,
    ...resume.experience.map((e) => e.description),
    ...resume.projects.map((p) => p.description),
    ...resume.leadership.map((l) => l.description),
  ]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const lengthOk = wordCount === 0 || (wordCount >= 80 && wordCount <= 700);
  checks.push({
    id: "length",
    label: "Resume Length",
    status: wordCount === 0 || lengthOk ? "pass" : "warn",
    suggestion:
      wordCount > 700
        ? "Trim descriptions to keep your resume to one or two pages."
        : undefined,
  });

  // Summary quality
  const summaryLen = resume.summary.text.trim().length;
  checks.push({
    id: "summary",
    label: "Summary Quality",
    status: summaryLen === 0 || summaryLen >= 50 ? "pass" : "warn",
    suggestion: summaryLen > 0 && summaryLen < 50 ? "Improve Summary — aim for 2-3 sentences." : undefined,
  });

  // Action verbs across experience + leadership descriptions
  const actionable = [...resume.experience, ...resume.leadership].filter((e) => e.description.trim());
  const verbRatio =
    actionable.length === 0
      ? 1
      : actionable.filter((e) => startsWithActionVerb(e.description)).length / actionable.length;
  checks.push({
    id: "verbs",
    label: "Action Verbs",
    status: actionable.length === 0 || verbRatio >= 0.5 ? "pass" : "warn",
    suggestion: verbRatio < 0.5 ? "Start bullet points with strong action verbs." : undefined,
  });

  // Metrics across experience + projects
  const metricSources = [...resume.experience.map((e) => e.description), ...resume.projects.map((p) => p.description)].filter(Boolean);
  const hasMetrics = metricSources.length === 0 || metricSources.some(containsMetric);
  checks.push({
    id: "metrics",
    label: "Quantified Impact",
    status: hasMetrics ? "pass" : "warn",
    suggestion: hasMetrics ? undefined : "Add Metrics — numbers make impact concrete.",
  });

  // Missing core sections
  const missingCore = (["education", "experience", "skills"] as const).filter(
    (id) => getSectionStatus(resume, id) === "empty"
  );
  checks.push({
    id: "sections",
    label: "Core Sections",
    status: missingCore.length === 0 ? "pass" : "warn",
    suggestion: missingCore.length > 0 ? `Add ${missingCore.join(", ")} to strengthen your resume.` : undefined,
  });

  const score = Math.round((checks.filter((c) => c.status === "pass").length / checks.length) * 100);

  return { score, checks };
}
