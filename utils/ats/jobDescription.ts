import { ATS_TAXONOMY, type AtsTaxonomyEntry } from "@/constants/ats-taxonomy";
import type { AtsKeywordCategory, AtsPriority } from "@/types/ats";
import {
  AMBIGUOUS_ALIASES,
  TECHNICAL_CATEGORIES,
  TECH_CONTEXT_RE,
  isAmbiguousFalsePositive,
  sentenceBounds,
} from "./context";
import { findTermSpans, makeSnippet, normalizeSearch, slugify } from "./normalize";

type JobSection =
  | "required"
  | "preferred"
  | "skills"
  | "responsibilities"
  | "general"
  | "other";

interface JobLine {
  index: number;
  text: string;
  normalized: string;
  section: JobSection;
  priority: AtsPriority;
  isHeading: boolean;
}

interface RawTaxonomyMatch {
  lineIndex: number;
  entry: AtsTaxonomyEntry;
  alias: string;
  start: number;
  end: number;
}

interface SelectedTaxonomyMatch extends RawTaxonomyMatch {
  priority: AtsPriority;
}

export interface ExtractedJobKeyword {
  id: string;
  label: string;
  category: AtsKeywordCategory;
  priority: AtsPriority;
  frequency: number;
  jdSnippet: string;
  aliases: string[];
}

export interface JobDescriptionExtraction {
  roleTitle?: string;
  wordCount: number;
  keywords: ExtractedJobKeyword[];
}

const GENERIC_WORDS = new Set([
  "a", "an", "and", "any", "are", "as", "at", "be", "by", "can", "candidate",
  "candidates", "company", "degree", "etc", "excellent", "experience", "for",
  "from", "good", "great", "hands", "have", "in", "including", "is", "it",
  "job", "knowledge", "must", "nice", "of", "on", "opportunity", "or", "our",
  "plus", "position", "preferred", "proven", "required", "requirements",
  "responsibilities", "role", "salary", "skills", "solid", "strong", "team",
  "teams", "the", "their", "this", "to", "using", "we", "will", "with",
  "work", "working", "you", "your", "years", "year", "ability", "advanced",
  "basic", "demonstrated", "environment", "skilled", "expertise", "background",
  "proficiency", "familiarity", "familiar",
]);

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "can", "could", "did", "do", "does", "for", "from", "had", "has", "have",
  "he", "her", "here", "him", "his", "how", "i", "if", "in", "into", "is",
  "it", "its", "me", "my", "of", "on", "or", "our", "she", "should", "so",
  "that", "the", "their", "them", "there", "these", "they", "this", "those",
  "to", "was", "we", "were", "what", "when", "where", "which", "who", "why",
  "will", "with", "would", "you", "your",
]);

const COMMON_UPPER_WORDS = new Set([
  "A", "AN", "AND", "ARE", "AS", "AT", "BE", "BY", "FOR", "FROM", "IF", "IN",
  "IS", "IT", "OF", "ON", "OR", "THE", "TO", "WE", "WITH", "YOU", "YOUR",
]);

function stripBullet(text: string): string {
  return text.replace(/^[\s#*\-\u2022\u00b7\u25aa\u25e6]+/, "").trim();
}

function headingSection(text: string): JobSection | null {
  const clean = stripBullet(text).replace(/[:\-–—]+$/, "").trim();
  if (!clean || clean.length > 80) return null;

  const lower = clean.toLowerCase();
  const words = lower.split(/\s+/);
  if (words.length > 9) return null;

  if (
    /^(required|requirements|must.have|basic qualifications|minimum qualifications|qualifications|what you.?ll need|what you.?ll bring|what we.?re looking for|who you are)\b/.test(
      lower
    ) ||
    /(required|must.have).*(skills|qualifications|experience)/.test(lower) ||
    /(skills|qualifications).*(required|must.have)/.test(lower)
  ) {
    return "required";
  }

  if (
    /^(preferred|preferred qualifications|nice.to.have|bonus|desired|good.to.have|plus)\b/.test(
      lower
    )
  ) {
    return "preferred";
  }

  if (/^(skills|technical skills|tech stack|technologies|tools|technology stack)\b/.test(lower)) {
    return "skills";
  }

  if (
    /^(responsibilities|what you.?ll do|duties|the role|role overview|about the role|day.to.day|you will)\b/.test(
      lower
    )
  ) {
    return "responsibilities";
  }

  if (
    /^(about|company|benefits|perks|compensation|why join|our team|equal opportunity)\b/.test(
      lower
    )
  ) {
    return "other";
  }

  if (/^[a-z &/+-]+:$/.test(lower) && words.length <= 4) return "general";

  return null;
}

function sectionPriority(section: JobSection): AtsPriority {
  if (section === "required" || section === "skills") return "critical";
  if (section === "preferred") return "preferred";
  return "standard";
}

function linePriority(text: string, section: JobSection): AtsPriority {
  const lower = text.toLowerCase();

  if (
    /\b(must.have|must-have|required|requirement|minimum|at least|mandatory|need to have)\b/.test(
      lower
    )
  ) {
    return "critical";
  }

  if (
    /\b(preferred|nice.to.have|nice-to-have|bonus|desired|good.to.have|a plus|is a plus)\b/.test(
      lower
    )
  ) {
    return "preferred";
  }

  return sectionPriority(section);
}

function expandJobLines(jd: string): JobLine[] {
  const rawLines = jd.split(/\r?\n/);
  const lines: JobLine[] = [];
  let currentSection: JobSection = "general";

  const pushLine = (text: string, section: JobSection, isHeading = false) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    lines.push({
      index: lines.length,
      text: clean,
      normalized: normalizeSearch(clean),
      section,
      priority: linePriority(clean, section),
      isHeading,
    });
  };

  const pushContent = (text: string, section: JobSection) => {
    const sentences = text
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    for (const sentence of sentences) pushLine(sentence, section);
  };

  for (const rawLine of rawLines) {
    const clean = stripBullet(rawLine);
    if (!clean) continue;

    const colonIndex = clean.indexOf(":");
    if (colonIndex > 0 && colonIndex < 70) {
      const left = clean.slice(0, colonIndex).trim();
      const right = clean.slice(colonIndex + 1).trim();
      const section = headingSection(left);
      if (section && right) {
        currentSection = section;
        pushContent(right, section);
        continue;
      }
      if (section) {
        currentSection = section;
        continue;
      }
    }

    const section = headingSection(clean);
    if (section) {
      currentSection = section;
      pushLine(clean, section, true);
      continue;
    }

    pushContent(clean, currentSection);
  }

  return lines;
}

function matchHasTechnicalContext(
  match: RawTaxonomyMatch,
  line: JobLine,
  lineMatches: RawTaxonomyMatch[]
): boolean {
  const alias = normalizeSearch(match.alias);
  if (!AMBIGUOUS_ALIASES.has(alias)) return true;
  if (line.section === "skills") return true;
  if (line.normalized === alias) return true;

  const { start, end } = sentenceBounds(line.normalized, match.start);
  const sentence = line.normalized.slice(start, end);

  if (isAmbiguousFalsePositive(match.alias, sentence)) return false;
  if (TECH_CONTEXT_RE.test(sentence)) return true;

  const sentenceMatches = lineMatches.filter(
    (other) => other.start >= start && other.end <= end
  );

  if (
    sentenceMatches.some(
      (other) =>
        !AMBIGUOUS_ALIASES.has(normalizeSearch(other.alias)) &&
        TECHNICAL_CATEGORIES.has(other.entry.category)
    )
  ) {
    return true;
  }

  return new Set(sentenceMatches.map((other) => other.entry.id)).size >= 2;
}

function collectTaxonomyMatches(lines: JobLine[]): SelectedTaxonomyMatch[] {
  const rawMatches: RawTaxonomyMatch[] = [];

  for (const line of lines) {
    if (line.isHeading) continue;
    for (const entry of ATS_TAXONOMY) {
      const aliases = Array.from(new Set([entry.label, ...entry.aliases]));
      for (const alias of aliases) {
        for (const span of findTermSpans(line.normalized, alias)) {
          rawMatches.push({
            lineIndex: line.index,
            entry,
            alias,
            start: span.start,
            end: span.end,
          });
        }
      }
    }
  }

  const linesByIndex = new Map(lines.map((line) => [line.index, line]));
  const rawMatchesByLine = new Map<number, RawTaxonomyMatch[]>();
  for (const match of rawMatches) {
    const existing = rawMatchesByLine.get(match.lineIndex) ?? [];
    existing.push(match);
    rawMatchesByLine.set(match.lineIndex, existing);
  }

  const filtered = rawMatches.filter((match) => {
    const line = linesByIndex.get(match.lineIndex);
    if (!line) return false;
    return matchHasTechnicalContext(
      match,
      line,
      rawMatchesByLine.get(match.lineIndex) ?? []
    );
  });

  const byLine = new Map<number, RawTaxonomyMatch[]>();
  for (const match of filtered) {
    const existing = byLine.get(match.lineIndex) ?? [];
    existing.push(match);
    byLine.set(match.lineIndex, existing);
  }

  const selected: SelectedTaxonomyMatch[] = [];

  for (const [lineIndex, matches] of byLine) {
    const line = lines.find((item) => item.index === lineIndex);
    if (!line) continue;

    const ordered = [...matches].sort(
      (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start
    );
    const accepted: RawTaxonomyMatch[] = [];

    for (const match of ordered) {
      const overlaps = accepted.some(
        (other) => match.start < other.end && match.end > other.start
      );
      if (!overlaps) accepted.push(match);
    }

    for (const match of accepted) {
      selected.push({ ...match, priority: line.priority });
    }
  }

  return selected;
}

interface AggregatedKeyword {
  entry: AtsTaxonomyEntry;
  frequency: number;
  priorities: Set<AtsPriority>;
  lines: number[];
  snippets: { priority: AtsPriority; index: number; text: string }[];
}

function priorityRank(priority: AtsPriority): number {
  if (priority === "critical") return 0;
  if (priority === "preferred") return 1;
  return 2;
}

function aggregateTaxonomyMatches(
  matches: SelectedTaxonomyMatch[],
  lines: JobLine[]
): ExtractedJobKeyword[] {
  const byEntry = new Map<string, AggregatedKeyword>();

  for (const match of matches) {
    const line = lines.find((item) => item.index === match.lineIndex);
    if (!line) continue;

    let aggregate = byEntry.get(match.entry.id);
    if (!aggregate) {
      aggregate = {
        entry: match.entry,
        frequency: 0,
        priorities: new Set<AtsPriority>(),
        lines: [],
        snippets: [],
      };
      byEntry.set(match.entry.id, aggregate);
    }

    aggregate.frequency += 1;
    aggregate.priorities.add(match.priority);
    aggregate.lines.push(match.lineIndex);
    aggregate.snippets.push({
      priority: match.priority,
      index: match.lineIndex,
      text: line.text,
    });
  }

  const keywords: ExtractedJobKeyword[] = [];

  for (const aggregate of byEntry.values()) {
    const priority = [...aggregate.priorities].sort(
      (a, b) => priorityRank(a) - priorityRank(b)
    )[0] ?? "standard";

    const snippet = [...aggregate.snippets].sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) || a.index - b.index
    )[0];

    keywords.push({
      id: `tax:${aggregate.entry.id}`,
      label: aggregate.entry.label,
      category: aggregate.entry.category,
      priority,
      frequency: aggregate.frequency,
      jdSnippet: makeSnippet(snippet.text, [aggregate.entry.label, ...aggregate.entry.aliases]),
      aliases: Array.from(new Set([aggregate.entry.label, ...aggregate.entry.aliases])),
    });
  }

  return keywords;
}

function trimCandidate(value: string): string {
  let candidate = value
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:•·\-–—]+/, "")
    .replace(/^and\s+/i, "")
    .replace(/^(?:strong|solid|excellent|good|great|hands.on|proven|demonstrated|advanced|basic|working)\s+/i, "")
    .replace(
      /^(?:experience|proficiency|proficient|knowledge|familiarity|familiar|skilled|expertise|background|ability)\s+(?:in|with|of|using)?\s*/i,
      ""
    )
    .replace(/^(?:must have|required|preferred|nice to have)\s*[:\-]?\s*/i, "")
    .replace(/\s*\((?:[^)]*)\)\s*$/g, "")
    .replace(/\s+(?:is|are)\s+(?:a plus|preferred|required|nice to have).*$/i, "")
    .replace(/[.,;:!?]+$/, "")
    .trim();

  if (candidate.length > 48) {
    candidate = candidate.split(/\s+/).slice(0, 4).join(" ");
  }

  return candidate.trim();
}

function formatCandidate(candidate: string): string {
  if (!candidate) return candidate;
  if (candidate === candidate.toUpperCase() && candidate.length <= 6) return candidate;
  if (candidate === candidate.toLowerCase()) {
    return candidate
      .split(" ")
      .map((word) =>
        word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word
      )
      .join(" ");
  }
  return candidate;
}

function isValidCandidate(
  candidate: string,
  knownTerms: Set<string>
): boolean {
  const normalized = normalizeSearch(candidate);
  if (!normalized || normalized.length < 2) return false;
  if (knownTerms.has(normalized)) return false;
  if (/\d{4}/.test(normalized)) return false;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  if (words.some((word) => STOP_WORDS.has(word))) return false;
  if (words.every((word) => GENERIC_WORDS.has(word))) return false;
  if (GENERIC_WORDS.has(words[0])) return false;
  if (/^(we|you|our|this|that|these|those|the|a|an|as|in|on|at|for|with|to|from|by|of)$/.test(normalized)) {
    return false;
  }
  if (/(?:will|join|looking|seeking|responsible|participate|collaborate|support|manage|lead|work|help)\b/.test(normalized)) {
    return false;
  }

  return true;
}

function overlapsSelectedSpan(
  line: JobLine,
  candidate: string,
  selectedByLine: Map<number, { start: number; end: number }[]>
): boolean {
  const spans = findTermSpans(line.normalized, candidate);
  if (spans.length === 0) return true;

  const selected = selectedByLine.get(line.index) ?? [];
  return spans.some((span) =>
    selected.some((other) => span.start < other.end && span.end > other.start)
  );
}

function extractUnknownCandidates(
  lines: JobLine[],
  selected: SelectedTaxonomyMatch[]
): ExtractedJobKeyword[] {
  const knownTerms = new Set<string>();
  for (const entry of ATS_TAXONOMY) {
    knownTerms.add(normalizeSearch(entry.label));
    for (const alias of entry.aliases) knownTerms.add(normalizeSearch(alias));
  }

  const selectedByLine = new Map<number, { start: number; end: number }[]>();
  for (const match of selected) {
    const existing = selectedByLine.get(match.lineIndex) ?? [];
    existing.push({ start: match.start, end: match.end });
    selectedByLine.set(match.lineIndex, existing);
  }

  const candidates = new Map<
    string,
    { label: string; priority: AtsPriority; snippet: string; index: number }
  >();

  const addCandidate = (line: JobLine, rawCandidate: string) => {
    const candidate = trimCandidate(rawCandidate);
    if (!candidate) return;

    const formatted = formatCandidate(candidate);
    if (!isValidCandidate(formatted, knownTerms)) return;
    if (line.section === "other") return;
    if (overlapsSelectedSpan(line, formatted, selectedByLine)) return;

    const key = normalizeSearch(formatted);
    if (!key) return;

    const existing = candidates.get(key);
    if (!existing || priorityRank(line.priority) < priorityRank(existing.priority)) {
      candidates.set(key, {
        label: formatted,
        priority: line.priority,
        snippet: makeSnippet(line.text, [formatted]),
        index: line.index,
      });
    }
  };

  for (const line of lines) {
    if (line.isHeading || line.section === "other") continue;

    const isSkillContext =
      line.section === "skills" ||
      line.section === "required" ||
      line.section === "preferred" ||
      line.priority !== "standard";

    if (!isSkillContext) continue;

    const quoteRe = /["“”']([^"“”']{2,45})["“”']/g;
    for (const match of line.text.matchAll(quoteRe)) addCandidate(line, match[1]);

    const cueRe =
      /\b(?:experience|proficiency|proficient|knowledge|familiarity|familiar|skilled|expertise|background|hands.on)\s+(?:in|with|of|using)\s+([^,.;:()\n]{2,80})/gi;
    for (const match of line.text.matchAll(cueRe)) {
      const chunks = match[1].split(/\s+and\s+/i);
      for (const chunk of chunks) addCandidate(line, chunk);
    }

    const listSeparatorCount = (line.text.match(/[,;|•·]/g) ?? []).length;
    if (line.section === "skills" || listSeparatorCount > 0) {
      const segments = line.text
        .split(/[,;|•·]/)
        .flatMap((segment) => segment.split(/\s+and\s+/i))
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (segments.length > 1) {
        for (const segment of segments) addCandidate(line, segment);
      }
    }

    const acronymRe = /\b[A-Z][A-Z0-9+#./-]{1,7}\b/g;
    for (const match of line.text.matchAll(acronymRe)) {
      if (COMMON_UPPER_WORDS.has(match[0])) continue;
      addCandidate(line, match[0]);
    }
  }

  return [...candidates.values()]
    .sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) || a.index - b.index
    )
    .slice(0, 12)
    .map((candidate, index) => ({
      id: `jd:${slugify(candidate.label)}:${index}`,
      label: candidate.label,
      category: "other" as const,
      priority: candidate.priority,
      frequency: 1,
      jdSnippet: candidate.snippet,
      aliases: [candidate.label],
    }));
}

function extractRoleTitle(jd: string): string | undefined {
  const match = jd.match(
    /^\s*(?:job title|position title|role title|position|role)\s*[:\-–—]\s*([^\n]{2,80})/im
  );
  if (!match) return undefined;

  const title = match[1].replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
  if (!title || /description|summary/i.test(title)) return undefined;
  return title;
}

export function extractJobDescription(jd: string): JobDescriptionExtraction {
  const lines = expandJobLines(jd);
  const selected = collectTaxonomyMatches(lines);
  const taxonomyKeywords = aggregateTaxonomyMatches(selected, lines);
  const unknownKeywords = extractUnknownCandidates(lines, selected);
  const words = jd.trim() ? jd.trim().split(/\s+/).length : 0;

  return {
    roleTitle: extractRoleTitle(jd),
    wordCount: words,
    keywords: [...taxonomyKeywords, ...unknownKeywords].sort(
      (a, b) =>
        priorityRank(a.priority) - priorityRank(b.priority) ||
        b.frequency - a.frequency ||
        a.label.localeCompare(b.label)
    ),
  };
}
