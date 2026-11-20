/** Text helpers shared by job-description parsing and resume matching. */

/** Lowercase, normalize unicode punctuation, and collapse whitespace while
 *  keeping characters that matter for technology names (C++, C#, .NET,
 *  Node.js, CI/CD). */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b`\u00b4]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isWordCharacter(char: string | undefined): boolean {
  return !!char && /[a-z0-9_]/.test(char);
}

export interface TermSpan {
  start: number;
  end: number;
}

/** Find all whole-word occurrences of `needle` in an already-normalized
 *  haystack. Boundaries are checked manually instead of using `\b` so
 *  names such as C++, .NET, and CI/CD behave correctly. */
export function findTermSpans(haystack: string, needle: string): TermSpan[] {
  const term = normalizeSearch(needle);
  if (!term) return [];

  const spans: TermSpan[] = [];
  let from = 0;

  while (from <= haystack.length - term.length) {
    const index = haystack.indexOf(term, from);
    if (index === -1) break;

    const before = haystack[index - 1];
    const after = haystack[index + term.length];
    const isLanguageSymbol =
      (term === "c" && (before === "-" || after === "+" || after === "#")) ||
      (term === "r" && (after === "&" || after === "/"));
    const isLanguageVersion =
      (term === "c++" || term === "c#") && !!after && /\d/.test(after);
    if (
      !isWordCharacter(before) &&
      (!isWordCharacter(after) || isLanguageVersion) &&
      !isLanguageSymbol
    ) {
      spans.push({ start: index, end: index + term.length });
    }

    from = index + Math.max(1, term.length);
  }

  return spans;
}

export function containsTerm(haystack: string, needle: string): boolean {
  return findTermSpans(normalizeSearch(haystack), needle).length > 0;
}

/** Truncate text to a readable snippet, preferring a window around the
 *  first matched term when one can be found in the original string. */
export function makeSnippet(
  text: string,
  terms: string[],
  maxLength = 190
): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  const lower = clean.toLowerCase();
  let index = -1;
  for (const term of terms) {
    const found = lower.indexOf(term.toLowerCase());
    if (found !== -1 && (index === -1 || found < index)) index = found;
  }

  if (index === -1) return `${clean.slice(0, maxLength - 1).trimEnd()}…`;

  const start = Math.max(0, index - Math.floor(maxLength * 0.35));
  const end = Math.min(clean.length, start + maxLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < clean.length ? "…" : "";
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

/** Turn a normalized string into a stable, URL-safe id fragment. */
export function slugify(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "keyword";
}
