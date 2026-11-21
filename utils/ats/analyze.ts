import type {
  AtsAnalysis,
  AtsCoverage,
  AtsKeyword,
  AtsPriorityBreakdown,
  AtsScores,
} from "@/types/ats";
import type { Resume } from "@/types/resume";
import { extractJobDescription } from "./jobDescription";
import { buildAtsReadiness, scoreReadiness } from "./readiness";
import { findRelatedSkills } from "./related";
import { buildAtsRequirements } from "./requirements";
import { buildResumeEvidence, matchKeywordInResume } from "./resumeIndex";
import { buildAtsSuggestions } from "./suggestions";

const PRIORITY_WEIGHT = {
  critical: 3,
  preferred: 1.6,
  standard: 1,
} as const;

const COVERAGE_WEIGHT: Record<AtsCoverage, number> = {
  strong: 1,
  supporting: 0.8,
  skills: 0.65,
  none: 0,
};

function buildPriorityBreakdown(keywords: AtsKeyword[]): AtsPriorityBreakdown {
  const breakdown: AtsPriorityBreakdown = {
    critical: { total: 0, matched: 0 },
    preferred: { total: 0, matched: 0 },
    standard: { total: 0, matched: 0 },
  };

  for (const keyword of keywords) {
    breakdown[keyword.priority].total += 1;
    if (keyword.coverage !== "none") breakdown[keyword.priority].matched += 1;
  }

  return breakdown;
}

function buildScores(
  keywords: AtsKeyword[],
  readinessScore: number,
  priority: AtsPriorityBreakdown
): AtsScores {
  let earned = 0;
  let possible = 0;
  let matchedKeywords = 0;
  let strongEvidence = 0;

  for (const keyword of keywords) {
    const frequencyBoost = 1 + Math.min(Math.max(keyword.frequency - 1, 0), 3) * 0.08;
    const weight = PRIORITY_WEIGHT[keyword.priority] * frequencyBoost;
    possible += weight;

    if (keyword.coverage === "none") continue;

    matchedKeywords += 1;
    if (keyword.coverage === "strong") strongEvidence += 1;

    const wordingFactor = keyword.match === "related" ? 0.9 : 1;
    earned += weight * COVERAGE_WEIGHT[keyword.coverage] * wordingFactor;
  }

  return {
    jobMatch: possible > 0 ? Math.round((earned / possible) * 100) : 0,
    criticalCoverage:
      priority.critical.total > 0
        ? Math.round((priority.critical.matched / priority.critical.total) * 100)
        : 0,
    readiness: readinessScore,
    matchedKeywords,
    totalKeywords: keywords.length,
    criticalMatched: priority.critical.matched,
    criticalTotal: priority.critical.total,
    strongEvidence,
  };
}

export function analyzeResumeAgainstJob(
  resume: Resume,
  jobDescription: string
): AtsAnalysis {
  const extraction = extractJobDescription(jobDescription);
  const evidence = buildResumeEvidence(resume);

  const keywords: AtsKeyword[] = extraction.keywords
    .slice(0, 50)
    .map((keyword) => {
      const match = matchKeywordInResume(keyword.label, keyword.aliases, evidence);
      return {
        id: keyword.id,
        label: keyword.label,
        category: keyword.category,
        priority: keyword.priority,
        frequency: keyword.frequency,
        match: match.match,
        matchedAlias: match.matchedAlias,
        coverage: match.coverage,
        relatedSkills:
          match.coverage === "none"
            ? findRelatedSkills(keyword.id, keyword.label, evidence)
            : [],
        jdSnippet: keyword.jdSnippet,
        locations: match.locations,
      };
    });

  const priority = buildPriorityBreakdown(keywords);
  const readiness = buildAtsReadiness(resume);
  const scores = buildScores(keywords, scoreReadiness(readiness), priority);
  const suggestions = buildAtsSuggestions(keywords, readiness);
  const requirements = buildAtsRequirements(extraction.requirements, resume);

  return {
    roleTitle: extraction.roleTitle,
    jdWordCount: extraction.wordCount,
    requirements,
    keywords,
    priority,
    readiness,
    suggestions,
    scores,
  };
}
