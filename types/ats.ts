/** ---------------------------------------------------------------------
 * ATS Insights data model.
 *
 * Phase 1 is deliberately local and deterministic: a pasted job
 * description is parsed with a curated skill taxonomy and lightweight
 * heuristics, then compared against the resume already held in memory.
 * Nothing here is sent to a server and no generated text is inserted into
 * the resume automatically.
 * ------------------------------------------------------------------- */

export type AtsPriority = "critical" | "preferred" | "standard";

export type AtsKeywordCategory =
  | "language"
  | "framework"
  | "database"
  | "cloud"
  | "tool"
  | "data"
  | "concept"
  | "methodology"
  | "soft-skill"
  | "domain"
  | "credential"
  | "other";

export type AtsSection =
  | "summary"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "certifications"
  | "achievements"
  | "languages"
  | "custom";

export type AtsMatchType = "exact" | "related" | "none";

/** How strongly the resume proves a keyword:
 *  - strong: used in a summary, experience, or project
 *  - supporting: education, certifications, achievements, languages, or custom
 *  - skills: listed in the Skills section only
 *  - none: not found */
export type AtsCoverage = "strong" | "supporting" | "skills" | "none";

export type AtsReadinessStatus = "pass" | "warning" | "fail";

export type AtsSuggestionTone = "critical" | "improve" | "tip";

export interface AtsKeywordLocation {
  section: AtsSection;
  sectionLabel: string;
  entryLabel?: string;
  snippet: string;
  match: Exclude<AtsMatchType, "none">;
  coverage: Exclude<AtsCoverage, "none">;
}

export interface AtsKeyword {
  id: string;
  label: string;
  category: AtsKeywordCategory;
  priority: AtsPriority;
  /** Number of times the term appears in the pasted job description. */
  frequency: number;
  /** Exact means the resume uses the same wording; related means an alias
   *  or common variant was found instead. */
  match: AtsMatchType;
  coverage: AtsCoverage;
  /** The resume wording that matched, when match is "related". */
  matchedAlias?: string;
  /** A short line from the job description that introduced the term. */
  jdSnippet?: string;
  locations: AtsKeywordLocation[];
}

export interface AtsReadinessCheck {
  id: string;
  label: string;
  status: AtsReadinessStatus;
  detail: string;
  suggestion?: string;
  weight: number;
}

export interface AtsSuggestion {
  id: string;
  title: string;
  detail: string;
  tone: AtsSuggestionTone;
  keywordLabel?: string;
}

export interface AtsPriorityBreakdown {
  critical: { total: number; matched: number };
  preferred: { total: number; matched: number };
  standard: { total: number; matched: number };
}

export interface AtsScores {
  jobMatch: number;
  criticalCoverage: number;
  readiness: number;
  matchedKeywords: number;
  totalKeywords: number;
  criticalMatched: number;
  criticalTotal: number;
  strongEvidence: number;
}

export interface AtsAnalysis {
  roleTitle?: string;
  jdWordCount: number;
  keywords: AtsKeyword[];
  priority: AtsPriorityBreakdown;
  readiness: AtsReadinessCheck[];
  suggestions: AtsSuggestion[];
  scores: AtsScores;
}
