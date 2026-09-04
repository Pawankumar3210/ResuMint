import type { Resume } from "@/types/resume";
import { ExperienceType } from "@/types/resume";
import { createId } from "@/lib/id";

/* ------------------------------------------------------------------ */
/* Text extraction (client-side only, nothing leaves the browser)      */
/* ------------------------------------------------------------------ */

export async function extractRawText(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractFromPdf(file);
  }
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  ) {
    return extractFromDocx(file);
  }
  throw new Error("Unsupported file type");
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Served as a static asset from /public rather than resolved via
  // `new URL(..., import.meta.url)` -- the latter is unreliable under
  // Turbopack for pdfjs-dist's worker specifically. The file in public/
  // is kept byte-identical to the installed pdfjs-dist version.
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    // Pages must be read in order to reconstruct the document's natural
    // top-to-bottom text flow, so awaiting sequentially here is correct.
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    const items: TextItem[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      items.push({ str: item.str, x: item.transform[4], y: item.transform[5] });
    }
    if (items.length > 0) pageTexts.push(extractPageText(items, viewport.width));
  }
  return pageTexts.join("\n\n");
}

/**
 * Many resume templates use a sidebar (contact/skills down the left,
 * everything else on the right, or vice versa). Reading such a PDF's text
 * items in raw stream order interleaves lines from both columns, which
 * scrambles section content between unrelated headings -- a common cause
 * of "wrong section" imports. When a clear vertical gutter is detected,
 * each column is read top-to-bottom independently and the results are
 * concatenated column-by-column instead.
 */
function extractPageText(items: TextItem[], pageWidth: number): string {
  const splitX = detectColumnSplit(items, pageWidth);
  if (splitX === null) return linesFromItems(items).join("\n");

  const left = items.filter((it) => it.x < splitX);
  const right = items.filter((it) => it.x >= splitX);
  return [...linesFromItems(left), "", ...linesFromItems(right)].join("\n");
}

function detectColumnSplit(items: TextItem[], pageWidth: number): number | null {
  if (items.length < 20) return null; // too little content to be confident

  // Look for the widest gap between consecutive item x-starts, but only
  // within the page's interior (15%-85% width) -- a real column gutter,
  // not the page margins or a single long word's natural spacing.
  const xs = [...items.map((it) => it.x)].sort((a, b) => a - b);
  const lo = pageWidth * 0.15;
  const hi = pageWidth * 0.85;

  let bestGap = 0;
  let bestSplit: number | null = null;
  for (let i = 1; i < xs.length; i++) {
    const mid = (xs[i] + xs[i - 1]) / 2;
    if (mid < lo || mid > hi) continue;
    const gap = xs[i] - xs[i - 1];
    if (gap > bestGap) {
      bestGap = gap;
      bestSplit = mid;
    }
  }
  // Require a genuinely wide gutter (6%+ of page width) and a meaningful
  // amount of content on both sides -- otherwise this is likely just
  // ordinary word spacing on a single-column page, not two columns.
  if (bestSplit === null || bestGap < pageWidth * 0.06) return null;
  const leftCount = items.filter((it) => it.x < bestSplit!).length;
  const rightCount = items.filter((it) => it.x >= bestSplit!).length;
  const minSide = items.length * 0.15;
  if (leftCount < minSide || rightCount < minSide) return null;

  return bestSplit;
}

function linesFromItems(items: TextItem[]): string[] {
  // Two text runs sharing one visual row -- e.g. a bold title and a
  // smaller, differently-styled date on the same tab-stopped line -- can
  // still end up with baselines a couple of units apart (observed ~2.5
  // units between a 12pt and a 9.5pt run on the same row), while genuinely
  // different rows are typically 15+ units apart.
  const SAME_LINE_Y_TOLERANCE = 6;

  // Pass 1: cluster into rows by Y-proximity, top of page first. Each row
  // is compared against its own *anchor* (the first, topmost item that
  // started it) rather than the most-recently-added item, so a row can't
  // drift arbitrarily far via a chain of small step-by-step deltas.
  const byY = [...items].sort((a, b) => b.y - a.y);
  const rows: TextItem[][] = [];
  for (const item of byY) {
    const currentRow = rows[rows.length - 1];
    if (currentRow && Math.abs(item.y - currentRow[0].y) <= SAME_LINE_Y_TOLERANCE) {
      currentRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  // Pass 2: within each row, order strictly left-to-right by X -- this is
  // what actually fixes the title/date ordering bug. A combined single
  // sort (by y then x) can't do this correctly, since two same-row items
  // with *any* nonzero y difference never reach the x tie-break at all.
  return rows.map((row) =>
    [...row]
      .sort((a, b) => a.x - b.x)
      .map((it) => it.str)
      .join(" ")
      .trim()
  );
}

async function extractFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return normalizeDocxText(result.value);
}

/**
 * mammoth's extractRawText unconditionally appends a blank line after
 * *every* paragraph (mammoth/lib/raw-text.js), not just where the
 * original document had real visual gaps -- so an ordinary
 * paragraph-to-paragraph transition (e.g. an institution name followed
 * immediately by its degree line) and a genuinely blank paragraph the
 * person typed to separate two entries both come out looking like a
 * blank line, with no way to tell them apart downstream. That made every
 * DOCX import over-fragment into one entry per paragraph -- exactly what
 * a person re-importing a resume built with ResuMint's own DOCX export
 * would hit, since it's one Paragraph per field.
 *
 * The two cases *are* distinguishable at this stage, though: an ordinary
 * boundary produces exactly one blank line (two consecutive newlines) in
 * mammoth's output, while a genuinely empty paragraph in between adds a
 * third (or more). Collapsing runs of exactly two newlines down to one
 * (removing the artificial gap) while keeping longer runs as a real
 * blank-line marker recovers the document's actual visual structure.
 */
function normalizeDocxText(raw: string): string {
  return raw.replace(/\n{2,}/g, (run) => (run.length === 2 ? "\n" : "\n\n"));
}

/* ------------------------------------------------------------------ */
/* Heuristic field extraction                                         */
/*                                                                     */
/* This is intentionally best-effort, not true NLP: resumes have no    */
/* standard format, so parsing is pattern-matching on common           */
/* conventions (section headings, email/phone regex, year ranges).     */
/* It will get contact details and skills right most of the time, and  */
/* education/experience roughly right -- the ImportResumeDialog always */
/* shows a preview before anything is applied, so the person can catch */
/* and fix whatever the heuristics missed.                             */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s()-]{8,}\d)/;
const LINKEDIN_RE = /(linkedin\.com\/[^\s,]+)/i;
const GITHUB_RE = /(github\.com\/[^\s,]+)/i;
const YEAR_RE = /(19|20)\d{2}/g;
const YEAR_TEST_RE = /(19|20)\d{2}/; // non-global counterpart for .test() -- see note below
// A "City, Region" (or "City, Country") line: two short comma-separated
// title-case-ish words with no digits, @ signs, or URLs.
const LOCATION_RE = /^[A-Za-z][A-Za-z.\s]{1,28},\s*[A-Za-z][A-Za-z.\s]{1,28}$/;

// Broad alias coverage, mapped onto the Resume type's fixed section keys.
// Order matters where aliases could overlap (checked top-to-bottom via
// Object.entries, first match wins) -- more specific patterns are listed
// before more general ones that might otherwise shadow them.
const SECTION_HEADINGS: Record<string, RegExp> = {
  summary: /^(summary|profile|objective|about( me)?|career objective|professional summary|personal statement|professional profile)\b/i,
  education: /^(education|academic (background|qualifications|details)|academics|educational qualifications)\b/i,
  experience: /^(experience|work experience|professional experience|employment( history)?|work history|career history|internships?( experience)?)\b/i,
  projects: /^(projects?|academic projects?|personal projects?|key projects?|project experience)\b/i,
  skills: /^(skills|technical skills|core competenc(y|ies)|competenc(y|ies)|tools( ?& ?technologies)?|technical proficienc(y|ies)|technologies)\b/i,
  certifications: /^(certifications?|licenses?( ?& ?certifications?)?|courses?( ?& ?certifications?)?)\b/i,
  achievements: /^(achievements?|awards?( ?& ?honors?)?|honors?|accomplishments?|extra[- ]?curricular( activities)?|co[- ]?curricular( activities)?|volunteer(ing)?( experience)?|hobbies|interests|publications?)\b/i,
  languages: /^(languages?|language proficiency|linguistic skills)\b/i,
  // Recognized purely so it terminates whatever section precedes it (e.g.
  // Languages) -- its content isn't imported into any field, since a
  // declaration is a statement about the resume itself, not resume data.
  declaration: /^declaration\b/i,
};

/** Strips leading bullets/icons and a trailing colon before heading tests. */
function normalizeHeadingCandidate(line: string): string {
  return line.replace(/^[\s\-•▪◦*·:]+/, "").replace(/[:\s]+$/, "");
}

// Single-word section-heading keywords, matched with whitespace stripped
// entirely -- a fallback for PDFs whose heading text was rendered with
// letter-spacing/tracking styling (ResuMint's own PDF export does this
// for section titles). Some PDF text extraction represents that as real
// space characters between individual letters right in the extracted
// string ("E D U C A T I O N"), which no ordinary heading regex -- built
// for real word-spacing -- can recognize. Detecting that shape (most
// tokens on the line are only 1-2 characters long) and re-testing with
// all whitespace removed recovers it. Limited to single-word headings
// since that covers every heading ResuMint's own export produces; a
// compound heading like "Career Objective" can't be reconstructed this
// way without knowing where the original word boundary was.
const NO_SPACE_HEADING_KEYWORDS: [string, string][] = [
  ["summary", "summary"],
  ["profile", "summary"],
  ["objective", "summary"],
  ["education", "education"],
  ["academics", "education"],
  ["experience", "experience"],
  ["employment", "experience"],
  ["internships", "experience"],
  ["internship", "experience"],
  ["projects", "projects"],
  ["project", "projects"],
  ["skills", "skills"],
  ["technologies", "skills"],
  ["certifications", "certifications"],
  ["certification", "certifications"],
  ["licenses", "certifications"],
  ["courses", "certifications"],
  ["achievements", "achievements"],
  ["achievement", "achievements"],
  ["awards", "achievements"],
  ["honors", "achievements"],
  ["accomplishments", "achievements"],
  ["hobbies", "achievements"],
  ["interests", "achievements"],
  ["publications", "achievements"],
  ["languages", "languages"],
  ["language", "languages"],
  ["declaration", "declaration"],
];

function matchLetterSpacedHeading(candidate: string): string | null {
  const tokens = candidate.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;
  const shortTokenRatio = tokens.filter((t) => t.length <= 2).length / tokens.length;
  if (shortTokenRatio < 0.6) return null;

  const collapsed = tokens.join("").toLowerCase();
  const match = NO_SPACE_HEADING_KEYWORDS.find(([keyword]) => collapsed === keyword);
  return match ? match[1] : null;
}

function splitIntoSections(text: string): Record<string, string[]> {
  const lines = text.split("\n").map((l) => l.trim());
  const sections: Record<string, string[]> = {};
  let current = "header";
  sections[current] = [];

  for (const rawLine of lines) {
    const candidate = normalizeHeadingCandidate(rawLine);
    const matchedHeading =
      candidate.length > 0 &&
      candidate.length < 48 &&
      candidate.split(/\s+/).length <= 6 &&
      !candidate.includes(":") &&
      Object.entries(SECTION_HEADINGS).find(([, re]) => re.test(candidate));
    const isHeading = matchedHeading ? matchedHeading[0] : matchLetterSpacedHeading(candidate);

    if (isHeading) {
      current = isHeading;
      sections[current] = sections[current] ?? [];
      continue;
    }
    sections[current] = sections[current] ?? [];
    // Blank lines are kept (not filtered out) -- chunkByBlankRun relies on
    // them as entry-boundary markers. Filtering them here would silently
    // merge every entry in a section into one lump, which was previously
    // causing multi-entry sections (e.g. two jobs) to import as a single,
    // wrongly-merged entry.
    sections[current].push(rawLine);
  }

  // Leading/trailing blanks (e.g. a trailing newline at end of file) aren't
  // entry separators and would otherwise corrupt the first/last chunk's
  // line count -- only interior blanks, which really do separate entries,
  // are kept.
  for (const key of Object.keys(sections)) {
    sections[key] = trimEdgeBlankLines(sections[key]);
  }
  return sections;
}

function trimEdgeBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === "") start++;
  while (end > start && lines[end - 1] === "") end--;
  return lines.slice(start, end);
}

/**
 * Splits a section's lines into per-entry chunks. Blank-line runs (real
 * paragraph breaks) are the primary signal; when the extraction collapsed
 * those (common from Word docs -- mammoth inserts a blank-line-equivalent
 * after *every* paragraph, not just between entries, so it's useless as a
 * boundary signal for DOCX -- and from some PDF exporters too), two
 * fallbacks try in sequence: a date-boundary split for sections where
 * entries carry dates (education/experience/certifications), and a
 * plain "does the previous line read like a finished sentence" split for
 * sections that don't (projects have no dates at all). Under-splitting
 * (one lumped entry the person can manually re-split) is still preferred
 * over over-splitting into garbage partial entries, so both fallbacks
 * require clear evidence before acting.
 */
function chunkByBlankRun(lines: string[], maxChunks: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line === "") {
      if (current.length) chunks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current);
  if (chunks.length > 1) return chunks.slice(0, maxChunks);

  if (lines.length > 1) {
    const dateLineCount = lines.filter((l) => YEAR_TEST_RE.test(l)).length;
    if (dateLineCount >= 2) {
      const byDate = splitByDateBoundaries(lines);
      if (byDate.length > 1) return byDate.slice(0, maxChunks);
    }
    const byHeader = splitByPlainHeaderBoundaries(lines);
    if (byHeader.length > 1) return byHeader.slice(0, maxChunks);
  }

  if (lines.length > 1) return [lines];
  return chunks.slice(0, maxChunks);
}

/**
 * Splits lines into entries using date-lines as boundary markers, for
 * sections with no blank-line structure at all (collapsed by extraction)
 * but clear evidence of 2+ entries (2+ separate lines mentioning a year).
 *
 * Different templates put the date on either the entry's first line
 * ("Company - Role - 2022-2024", description lines follow) or its second
 * ("Institution" then "Degree, 2021-2025", nothing meaningful follows) --
 * so a fixed "split before/after the date" rule breaks one shape or the
 * other. Instead: accumulate lines into the current entry, and only close
 * it once a *second* date-line appears in the same bucket (clear proof
 * two entries have been merged). At that point, check whether the line
 * immediately before this new date-line looks like a header (short,
 * doesn't end in a period, i.e. not a description sentence) rather than
 * a continuation of the previous entry's description -- if so, it
 * belongs to the new entry and is moved over with it.
 */
function splitByDateBoundaries(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let bucket: string[] = [];
  let bucketHasDate = false;

  for (const line of lines) {
    const hasDate = YEAR_TEST_RE.test(line);

    if (hasDate && bucketHasDate) {
      const prev = bucket[bucket.length - 1];
      const prevLooksLikeHeader = prev !== undefined && prev.length <= 55 && !prev.endsWith(".");
      if (prevLooksLikeHeader && bucket.length > 1) {
        bucket.pop();
        chunks.push(bucket);
        bucket = [prev, line];
      } else {
        chunks.push(bucket);
        bucket = [line];
      }
      bucketHasDate = true;
      continue;
    }

    bucket.push(line);
    if (hasDate) bucketHasDate = true;
  }
  if (bucket.length) chunks.push(bucket);
  return chunks;
}

/**
 * Splits lines into entries purely by sentence-completion, for sections
 * with no date signal at all (projects have none). A line is treated as
 * the start of a new entry only once the line before it looks like a
 * finished description sentence (ends with a period) *and* the candidate
 * line itself looks like a header rather than a continuation (short, no
 * trailing period). Requiring the *previous* line to already look
 * "finished" is what keeps a multi-sentence single entry's later bullets
 * from being mistaken for new entries.
 */
function splitByPlainHeaderBoundaries(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let bucket: string[] = [];
  for (const line of lines) {
    const prev = bucket[bucket.length - 1];
    const prevCompletesEntry = prev !== undefined && prev.trim().endsWith(".");
    const looksLikeNewHeader = line.length <= 90 && !line.trim().endsWith(".");
    if (looksLikeNewHeader && prevCompletesEntry) {
      chunks.push(bucket);
      bucket = [line];
    } else {
      bucket.push(line);
    }
  }
  if (bucket.length) chunks.push(bucket);
  return chunks;
}

const MONTH_SRC =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_TOKEN_SRC = `(?:${MONTH_SRC}[\\s·.]*\\s*)?(?:19|20)\\d{2}`;
// Matches a trailing date, optionally a range, optionally with month
// names ("May 2025 -- Jul 2025", "2022-2024", "Aug 2024 -- Present") and
// an optional leading delimiter -- built as one pattern (rather than
// reusing the generic field-delimiter split below) because a naive
// delimiter split can't tell a role/org separator from the date range's
// own internal dash apart; anchoring specifically on the date's shape
// avoids that ambiguity entirely.
const TRAILING_DATE_RE = new RegExp(
  `\\s*[-\u2013\u2014|]?\\s*${DATE_TOKEN_SRC}(?:\\s*[-\u2013\u2014]\\s*(?:${DATE_TOKEN_SRC}|Present|Current))?\\s*$`,
  "i"
);

/**
 * Recovers two fields (e.g. institution/degree, organization/role, cert
 * name/issuer) from a single un-split line, for entries an extraction
 * flattened onto one line. Strips a trailing date/date-range first (so
 * it doesn't end up stuck onto the second field), then splits on the
 * first space-padded dash/pipe/bullet -- deliberately not commas, which
 * show up too often inside a single field (e.g. "New York, NY") to be a
 * safe delimiter.
 */
function splitEntryLine(line: string): [string, string] {
  const withoutTrailingDate = line.replace(TRAILING_DATE_RE, "").trim();
  const m = withoutTrailingDate.match(/^(.*?)\s+[-\u2013\u2014|\u2022]\s+(.*)$/);
  if (m) return [m[1].trim(), m[2].trim()];
  return [withoutTrailingDate, ""];
}

/** True if a line looks like an entire entry header flattened onto one
 *  line (e.g. "Company - Role - 2022-2024") -- has both a delimiter and
 *  a year, as opposed to a plain description sentence that happens to
 *  mention one. */
function looksLikeCombinedHeader(line: string): boolean {
  return YEAR_TEST_RE.test(line) && /\s[-\u2013\u2014|\u2022]\s/.test(line);
}

/** Matches a GPA/CGPA/percentage-shaped line, e.g. "8.7 CGPA", "3.8/4.0
 *  GPA", "85%" -- used to recover EducationEntry.grade, which none of the
 *  chunking above knows to look for since it isn't part of any header. */
const GRADE_RE = /\b\d+(\.\d+)?\s*(\/\s*\d+(\.\d+)?)?\s*(CGPA|GPA)\b|\b\d{1,3}(\.\d+)?\s*%/i;

function findGradeLine(lines: string[]): string {
  return lines.find((l) => GRADE_RE.test(l))?.trim() ?? "";
}

/** A bare domain-shaped token, e.g. "github.com/user/repo" or
 *  "resumint.vercel.app" -- deliberately not a full URL regex (no
 *  scheme required), since exported resumes show links without
 *  "https://" in front. */
const URL_TOKEN_RE = /[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s·|]*)?/i;

/** Splits a project's header line into its name and a trailing links
 *  portion, by finding where the first URL-shaped token starts (rather
 *  than a literal tab or other delimiter, which isn't consistently
 *  preserved across extraction sources -- DOCX keeps a real tab
 *  character here, PDF text extraction collapses it to a plain space). */
function splitNameAndLinks(line: string): [string, string] {
  const match = line.match(URL_TOKEN_RE);
  if (!match || match.index === undefined) return [line.trim(), ""];
  return [line.slice(0, match.index).trim(), line.slice(match.index).trim()];
}


/** Strips a leading "Category / Label: " prefix (ResuMint's own skills
 *  export groups by category this way) before splitting a line into
 *  individual items, so the label itself doesn't get parsed as a skill. */
function stripCategoryLabel(line: string): string {
  return line.replace(/^[A-Za-z][A-Za-z\s/]{0,40}:\s*/, "");
}

function extractSkills(lines: string[]): string[] {
  const joined = lines.map(stripCategoryLabel).join(", ");
  return joined
    .split(/[,•·|\/]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 30)
    .slice(0, 20);
}

export interface ParsedResumeResult {
  data: Partial<Resume>;
  summary: {
    detectedName: boolean;
    detectedEmail: boolean;
    educationCount: number;
    experienceCount: number;
    projectCount: number;
    skillCount: number;
    certificationCount: number;
  };
}

export function parseResumeText(rawText: string): ParsedResumeResult {
  const text = rawText.replace(/\r/g, "");
  const sections = splitIntoSections(text);
  const headerBlock = sections.header ?? [];

  const email = text.match(EMAIL_RE)?.[0] ?? "";
  const phone = text.match(PHONE_RE)?.[0]?.trim() ?? "";
  const linkedin = text.match(LINKEDIN_RE)?.[0] ?? "";
  const github = text.match(GITHUB_RE)?.[0] ?? "";

  // Name: first non-empty header line that isn't itself contact info.
  const fullName =
    headerBlock.find(
      (line) => line && !EMAIL_RE.test(line) && !PHONE_RE.test(line) && line.length < 60
    ) ?? "";

  const location =
    headerBlock.find(
      (line) =>
        line !== fullName &&
        !EMAIL_RE.test(line) &&
        !PHONE_RE.test(line) &&
        !LINKEDIN_RE.test(line) &&
        !GITHUB_RE.test(line) &&
        LOCATION_RE.test(line)
    ) ?? "";

  const data: Partial<Resume> = {
    personal: {
      fullName,
      email,
      phone,
      location,
      linkedin,
      github,
      portfolio: "",
    },
  };

  if (sections.summary?.length) {
    data.summary = { text: sections.summary.filter(Boolean).join(" ").slice(0, 300) };
  }

  if (sections.education?.length) {
    const chunks = chunkByBlankRun(sections.education, 5);
    data.education = chunks.map((chunk) => {
      const years = chunk.join(" ").match(YEAR_RE) ?? [];
      const headerLine = chunk[0] ?? "";
      let institution: string;
      let degree: string;
      if (chunk.length === 1 || looksLikeCombinedHeader(headerLine)) {
        [institution, degree] = splitEntryLine(headerLine);
      } else {
        institution = headerLine;
        degree = chunk[1] ?? "";
      }
      return {
        id: createId(),
        institution,
        degree,
        branch: "",
        grade: findGradeLine(chunk),
        startMonth: "",
        startYear: years[0] ?? "",
        endMonth: "",
        endYear: years[1] ?? years[0] ?? "",
      };
    });
  }

  // Recognizes ResuMint's own ExperienceType labels (e.g. "Internship",
  // "Club Experience") when a resume made with ResuMint is re-imported --
  // exported as its own dedicated line, per docxExport.ts / the PDF/preview
  // renderers, so a plain "role/org header, then this line" shape is a
  // strong signal, not description prose.
  const EXPERIENCE_TYPE_BY_LABEL = new Map(
    Object.values(ExperienceType).map((v) => [v.toLowerCase(), v])
  );

  if (sections.experience?.length) {
    const chunks = chunkByBlankRun(sections.experience, 6);
    data.experience = chunks.map((chunk) => {
      const years = chunk.join(" ").match(YEAR_RE) ?? [];
      const headerLine = chunk[0] ?? "";
      let role: string;
      let organization: string;
      let rest: string[];
      if (chunk.length === 1) {
        [role, organization] = splitEntryLine(headerLine);
        rest = [];
      } else if (looksLikeCombinedHeader(headerLine)) {
        [role, organization] = splitEntryLine(headerLine);
        rest = chunk.slice(1);
      } else {
        organization = headerLine;
        role = chunk[1] ?? "";
        rest = chunk.slice(2);
      }

      let type = ExperienceType.Internship;
      if (rest.length > 0) {
        const matched = EXPERIENCE_TYPE_BY_LABEL.get(rest[0].trim().toLowerCase());
        if (matched) {
          type = matched;
          rest = rest.slice(1);
        }
      }

      return {
        id: createId(),
        type,
        organization,
        role,
        description: rest.join(" "),
        startMonth: "",
        startYear: years[0] ?? "",
        endMonth: "",
        endYear: years[1] ?? years[0] ?? "",
        current: false,
      };
    });
  }

  if (sections.projects?.length) {
    const chunks = chunkByBlankRun(sections.projects, 5);
    data.projects = chunks.map((chunk) => {
      // ResuMint's own export puts the name and links on one line
      // ("ResuMint\tgithub.com/... · resumint.vercel.app" in DOCX, or the
      // same layout with a plain space instead of a tab once extracted
      // from a PDF). Detecting the link portion by where a URL-shaped
      // token starts -- rather than splitting on a literal tab -- works
      // for both.
      const [namePart, linkPart] = splitNameAndLinks(chunk[0] ?? "");
      const links = linkPart.split(/\s*[·|]\s*/).map((l) => l.trim()).filter(Boolean);
      const githubUrl = links.find((l) => /github\.com/i.test(l)) ?? "";
      const liveUrl = links.find((l) => l !== githubUrl) ?? (githubUrl ? "" : links[0] ?? "");
      return {
        id: createId(),
        name: namePart,
        description: chunk.slice(1).join(" "),
        githubUrl,
        liveUrl,
      };
    });
  }

  if (sections.skills?.length) {
    data.skills = extractSkills(sections.skills).map((label) => ({ id: createId(), label, category: "other" as const }));
  }

  if (sections.certifications?.length) {
    const chunks = chunkByBlankRun(sections.certifications, 6);
    data.certifications = chunks.map((chunk) => {
      const years = chunk.join(" ").match(YEAR_RE) ?? [];
      const [name, organization] = chunk.length === 1 ? splitEntryLine(chunk[0]) : [chunk[0] ?? "", chunk[1] ?? ""];
      return {
        id: createId(),
        name,
        organization,
        month: "",
        year: years[0] ?? "",
      };
    });
  }

  if (sections.achievements?.length) {
    data.achievements = sections.achievements.filter(Boolean).slice(0, 10).map((text) => ({ id: createId(), text }));
  }

  if (sections.languages?.length) {
    data.languages = extractSkills(sections.languages).map((label) => ({ id: createId(), label }));
  }

  return {
    data,
    summary: {
      detectedName: !!fullName,
      detectedEmail: !!email,
      educationCount: data.education?.length ?? 0,
      experienceCount: data.experience?.length ?? 0,
      projectCount: data.projects?.length ?? 0,
      skillCount: data.skills?.length ?? 0,
      certificationCount: data.certifications?.length ?? 0,
    },
  };
}
