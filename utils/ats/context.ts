import { ATS_TAXONOMY } from "@/constants/ats-taxonomy";
import type { AtsKeywordCategory } from "@/types/ats";
import { findTermSpans, normalizeSearch } from "./normalize";

export const AMBIGUOUS_ALIASES = new Set(
  ATS_TAXONOMY.filter((entry) => entry.ambiguous).map((entry) =>
    normalizeSearch(entry.label)
  )
);

export const TECHNICAL_CATEGORIES = new Set<AtsKeywordCategory>([
  "language",
  "framework",
  "database",
  "cloud",
  "tool",
  "data",
  "concept",
  "methodology",
]);

export const TECH_CONTEXT_RE =
  /\b(experience|experienced|proficien(?:t|cy)|knowledge|familiar(?:ity)?|skills?|technolog(?:y|ies)|tools?|frameworks?|librar(?:y|ies)|languages?|databases?|cloud|platforms?|stack|apis?|code|coding|programming|software|engineer(?:ed|ing)?|develop(?:er|ers|ed|ing|ment)?|programmers?|architects?|built|build(?:ing)?|created?|designed?|maintained?|migrated?|integrated?|scaled?|optimized?|launched?|delivered?|implement(?:ed|ing|ation)?|deploy(?:ed|ing|ment)?|debug(?:ged|ging)?|test(?:ed|ing)?|automat(?:ed|ion|ing)?|using|data|analytics|machine learning|ai|frontend|front-end|backend|back-end|full-stack|mobile|web|ios|android|devops|security|infrastructure|applications?|apps?|dashboards?|websites?|sites?|interfaces?|components?|firmware|embedded|low-level|statistic(?:al|s)?|spreadsheets?|formulas?|pivots?)\b/i;

const NEGATION_BEFORE_RE =
  /\b(?:no|not|without|excluding|except|never|don['’]?t|doesn['’]?t|didn['’]?t)\b(?:\s+[\w.+#/-]+){0,4}\s*:?\s*$/i;
const NEGATION_AFTER_RE =
  /^\s*(?:(?:is|are|was|were|isn['’]?t|aren['’]?t)\s+)?(?:not|never)\s+(?:required|needed|necessary|used|supported|expected|mandatory|essential)\b/i;
const INCLUSIVE_NEGATION_RE = /\bnot\s+(?:limited|restricted)\s+to\b/i;

const AMBIGUOUS_FALSE_POSITIVES: Record<string, RegExp> = {
  react: /\breact(?:s|ed|ing)?\s+(?:to|quickly|well|positively|calmly|appropriately)\b/i,
  express: /\bexpress(?:es|ed|ing)?\s+(?:your|their|ideas|opinions|thoughts|concerns|interest|creativity|clearly|yourself)\b/i,
  swift: /\bswift\s+(?:action|response|resolution|execution|communication|turnaround)\b/i,
  spark: /\bspark(?:s|ed|ing)?\s+(?:innovation|change|conversation|interest|growth|new|ideas|creativity)\b/i,
  rust: /\brust\s+(?:prevention|removal|free|treatment)\b/i,
  excel: /\bexcel(?:s|led|ling)?\s+(?:in|at|as)\b/i,
  r: /\br\s*(?:&|and)\s*d\b/i,
  go: /\bgo(?:ing)?(?:[\s-]+to)?[\s-]+(?:market|beyond|above|through|back|forward|live|production)\b/i,
};

export interface SentenceBounds {
  start: number;
  end: number;
}

export function sentenceBounds(text: string, index: number): SentenceBounds {
  const boundaries = [".", "!", "?", ";"];
  let start = 0;
  let end = text.length;

  for (const boundary of boundaries) {
    const before = text.lastIndexOf(boundary, index - 1);
    if (before > start) start = before + 1;
    const after = text.indexOf(boundary, index);
    if (after !== -1 && after < end) end = after;
  }

  return { start, end };
}

/** Detects phrases such as "no Kubernetes required", "React is not
 *  required", or "without Docker" so a negated mention is not treated as
 *  a job requirement. Inclusive phrases like "not limited to React" are
 *  deliberately left alone. */
export function isNegatedTerm(
  text: string,
  start: number,
  end: number
): boolean {
  const before = text.slice(Math.max(0, start - 72), start).trim();
  const after = text.slice(end, Math.min(text.length, end + 64));

  if (INCLUSIVE_NEGATION_RE.test(before)) return false;
  if (/\bnot\s+only\b/i.test(before)) return false;

  return NEGATION_BEFORE_RE.test(before) || NEGATION_AFTER_RE.test(after);
}

export function isAmbiguousFalsePositive(
  alias: string,
  sentence: string
): boolean {
  return AMBIGUOUS_FALSE_POSITIVES[normalizeSearch(alias)]?.test(sentence) ?? false;
}

export function hasOtherTechnicalTerm(
  text: string,
  excludedTerms: string[]
): boolean {
  const normalized = normalizeSearch(text);
  const excluded = new Set(excludedTerms.map(normalizeSearch));

  for (const entry of ATS_TAXONOMY) {
    if (!TECHNICAL_CATEGORIES.has(entry.category)) continue;

    for (const alias of [entry.label, ...entry.aliases]) {
      const normalizedAlias = normalizeSearch(alias);
      if (excluded.has(normalizedAlias)) continue;
      if (AMBIGUOUS_ALIASES.has(normalizedAlias)) continue;
      if (findTermSpans(normalized, alias).length > 0) return true;
    }
  }

  return false;
}
