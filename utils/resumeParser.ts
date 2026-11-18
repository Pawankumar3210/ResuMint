import type {
  Resume,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SkillItem,
  SkillCategoryConfig,
  CertificationEntry,
  AchievementEntry,
  LanguageItem,
  ReorderableSectionId,
} from "@/types/resume";
import { ExperienceType } from "@/types/resume";
import { createId } from "@/lib/id";
import { cleanWhitespace, normalizeProfileUrl } from "@/utils/resumeValidation";
import { DEFAULT_SKILL_CATEGORIES, MAX_SUMMARY_LENGTH } from "@/constants/resume-defaults";

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
  width: number;
  height: number;
}

interface PageRow {
  text: string;
  items: TextItem[];
  y: number;
}

interface PdfPage {
  items: TextItem[];
  width: number;
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: PdfPage[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: TextItem[] = [];

    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      items.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
        height: item.height || Math.abs(item.transform[3]) || 0,
      });
    }

    if (items.length > 0) pages.push({ items, width: viewport.width });
  }

  return assemblePdfText(pages);
}

function assemblePdfText(pages: PdfPage[]): string {
  const pageRows = pages.map((page) => buildRows(page.items));
  const repeated = findRepeatedEdgeLines(pageRows.map((rows) => rows.map((row) => row.text)));
  const pageTexts: string[] = [];

  pageRows.forEach((rows, index) => {
    const filtered = rows.filter((row) => {
      if (isPageNumberLine(row.text)) return false;
      if (index > 0 && repeated.has(normalizeLineKey(row.text))) return false;
      return true;
    });

    if (filtered.length === 0) return;

    if (index === 0) {
      const page = pages[index];
      const filteredItems = filtered.flatMap((row) => row.items);
      const split = detectColumnSplit(filteredItems, page.width);

      if (split) {
        const mainItems = filteredItems.filter((item) =>
          split.mainSide === "left" ? item.x < split.x : item.x >= split.x
        );
        const sideItems = filteredItems.filter((item) =>
          split.mainSide === "left" ? item.x >= split.x : item.x < split.x
        );

        const mainRows = buildRows(mainItems);
        const firstHeading = mainRows.findIndex((row) => matchHeading(row.text) !== null);
        const headerRows = firstHeading === -1 ? [] : mainRows.slice(0, firstHeading);
        const headerBottom = headerRows.length
          ? Math.min(...headerRows.map((row) => row.y))
          : Number.POSITIVE_INFINITY;

        const mainBodyLines = buildRows(mainItems.filter((item) => item.y < headerBottom - 6)).map(
          (row) => row.text
        );
        const sideLines = buildRows(sideItems).map((row) => row.text);

        pageTexts.push(
          [
            ...headerRows.map((row) => row.text),
            ...mainBodyLines,
            "",
            ...sideLines,
          ]
            .join("\n")
            .trim()
        );
      } else {
        pageTexts.push(layoutRows(filtered, page.width).join("\n").trim());
      }
    } else {
      pageTexts.push(layoutRows(filtered, pages[index].width).join("\n").trim());
    }
  });

  return pageTexts.filter(Boolean).join("\n\n");
}

function buildRows(items: TextItem[]): PageRow[] {
  const tolerance = 6;
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows: PageRow[] = [];

  for (const item of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(item.y - current.y) <= tolerance) {
      current.items.push(item);
    } else {
      rows.push({ text: "", items: [item], y: item.y });
    }
  }

  for (const row of rows) {
    row.text = row.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return rows.filter((row) => row.text.length > 0);
}

function findRepeatedEdgeLines(pageLines: string[][]): Set<string> {
  if (pageLines.length < 2) return new Set();
  const counts = new Map<string, number>();

  for (const lines of pageLines) {
    const edge = [...lines.slice(0, 4), ...lines.slice(-3)];
    const seen = new Set<string>();
    for (const line of edge) {
      const key = normalizeLineKey(line);
      if (!key || key.length < 3 || seen.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const repeated = new Set<string>();
  for (const [key, count] of counts) {
    if (count >= 2) repeated.add(key);
  }
  return repeated;
}

function normalizeLineKey(line: string): string {
  return line
    .toLowerCase()
    .replace(/page\s+\d+(\s+of\s+\d+)?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isPageNumberLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return (
    /^(?:page\s*)?\d{1,3}(?:\s*(?:of|\/)\s*\d{1,3})?$/i.test(trimmed) ||
    /^page\s*[:\-]?\s*\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(trimmed)
  );
}

function layoutRows(rows: PageRow[], pageWidth: number): string[] {
  const items = rows.flatMap((row) => row.items);
  const split = detectColumnSplit(items, pageWidth);
  if (!split) return rows.map((row) => row.text);

  const leftRows = buildRows(items.filter((item) => item.x < split.x));
  const rightRows = buildRows(items.filter((item) => item.x >= split.x));
  const left = leftRows.map((row) => row.text);
  const right = rightRows.map((row) => row.text);

  if (left.length === 0) return right;
  if (right.length === 0) return left;

  return split.mainSide === "left" ? [...left, "", ...right] : [...right, "", ...left];
}

function detectColumnSplit(
  items: TextItem[],
  pageWidth: number
): { x: number; mainSide: "left" | "right" } | null {
  if (items.length < 25) return null;

  const minX = Math.min(...items.map((item) => item.x));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  if (maxX - minX < pageWidth * 0.5) return null;

  const counts = new Map<number, number>();
  for (const item of items) {
    const x = Math.round(item.x * 2) / 2;
    counts.set(x, (counts.get(x) ?? 0) + 1);
  }

  const startXs = [...counts.keys()].sort((a, b) => a - b);
  let split: number | null = null;
  let bestGap = 0;
  let cumulative = 0;

  for (let i = 0; i < startXs.length - 1; i++) {
    cumulative += counts.get(startXs[i]) ?? 0;
    const remaining = items.length - cumulative;
    const gap = startXs[i + 1] - startXs[i];
    if (gap < pageWidth * 0.07) continue;
    if (cumulative < items.length * 0.2 || remaining < items.length * 0.2) continue;
    if (gap > bestGap) {
      bestGap = gap;
      split = (startXs[i] + startXs[i + 1]) / 2;
    }
  }

  if (split === null) return null;

  const left = items.filter((item) => item.x < split);
  const right = items.filter((item) => item.x >= split);

  if (left.length < items.length * 0.2 || right.length < items.length * 0.2) return null;

  const leftEdge = percentile(left.map((item) => item.x + item.width), 0.9);
  const rightStart = percentile(right.map((item) => item.x), 0.1);

  if (rightStart - leftEdge < pageWidth * 0.03) return null;

  const leftWidth = leftEdge - percentile(left.map((item) => item.x), 0.1);
  const rightWidth = percentile(right.map((item) => item.x + item.width), 0.9) - rightStart;

  if (leftWidth < pageWidth * 0.12 || rightWidth < pageWidth * 0.12) return null;

  return {
    x: (leftEdge + rightStart) / 2,
    mainSide: leftWidth >= rightWidth ? "left" : "right",
  };
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function extractFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();

  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const lines = htmlToLines(result.value);
    if (lines.length > 0) return lines.join("\n");
  } catch {
  }

  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

function htmlToLines(html: string): string[] {
  if (typeof DOMParser === "undefined") return htmlToLinesFallback(html);

  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines: string[] = [];
  const blockTags = new Set([
    "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6",
    "LI", "UL", "OL", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH",
    "SECTION", "ARTICLE", "BLOCKQUOTE", "PRE", "FIGURE", "FIGCAPTION", "ADDRESS",
  ]);

  const emit = (element: Element) => {
    const text = cleanWhitespace(element.textContent ?? "");
    if (!text) return;
    lines.push(element.tagName === "LI" ? `• ${text}` : text);
  };

  const walk = (element: Element) => {
    if (element.tagName === "BR") return;
    const children = Array.from(element.children);
    const hasBlockChild = children.some((child) => blockTags.has(child.tagName));

    if (element.tagName === "LI") {
      emit(element);
      return;
    }

    if (blockTags.has(element.tagName) && !hasBlockChild) {
      emit(element);
      return;
    }

    if (!blockTags.has(element.tagName) && !hasBlockChild) return;

    for (const child of children) walk(child);
  };

  walk(doc.body);
  return lines;
}

function htmlToLinesFallback(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|tr|table|section|article|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split("\n")
    .map((line) => cleanWhitespace(line))
    .filter(Boolean);
}

const LIGATURES: Record<string, string> = {
  "\uFB00": "ff",
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
  "\uFB05": "st",
  "\uFB06": "st",
};

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\uFB00-\uFB06]/g, (char) => LIGATURES[char] ?? char)
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2022\u2023\u25AA\u25AB\u25E6\u2043\u2219\u00B7]/g, "•")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .map((line) => line.replace(/^•\s*/, "• "))
    .join("\n");
}

function normalizeLines(text: string): string[] {
  const lines = normalizeExtractedText(text).split("\n");
  const joined: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    while (
      /[A-Za-z]-$/.test(line) &&
      i + 1 < lines.length &&
      /^[a-z]/.test(lines[i + 1].trim())
    ) {
      line = line.slice(0, -1) + lines[i + 1].trim();
      i++;
    }
    joined.push(line);
  }

  const output: string[] = [];
  let lastBlank = true;
  for (const line of joined) {
    if (!line) {
      if (!lastBlank) output.push("");
      lastBlank = true;
      continue;
    }
    output.push(line);
    lastBlank = false;
  }

  return trimEdgeBlankLines(output);
}

function trimEdgeBlankLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === "") start++;
  while (end > start && lines[end - 1] === "") end--;
  return lines.slice(start, end);
}

function linesForTarget(captures: SectionCapture[], target: ReorderableSectionId): string[] {
  const result: string[] = [];
  for (const capture of captures) {
    if (capture.target !== target) continue;
    if (capture.lines.length > 0) result.push(...capture.lines, "");
  }
  return trimEdgeBlankLines(result);
}

interface HeadingRule {
  target: ReorderableSectionId | "header" | "skip";
  pattern: RegExp;
  type?: ExperienceType;
}

interface HeadingMatch {
  target: ReorderableSectionId | "header" | "skip";
  type?: ExperienceType;
  inline?: string;
}

const HEADING_RULES: HeadingRule[] = [
  {
    target: "summary",
    pattern:
      /^(?:(?:professional|career|executive|personal)\s+)?(?:summary|profile|objective|statement|bio|introduction|about(?:\s+me)?|overview)$/i,
  },
  {
    target: "education",
    pattern:
      /^(?:education(?:\s+(?:and\s+)?(?:training|qualifications?|details|history))?|educational?\s+(?:background|qualifications?|details|history|credentials?)|academics?|academic\s+(?:background|qualifications?|details|history|credentials?|record)|qualifications?|schooling)$/i,
  },
  {
    target: "experience",
    pattern:
      /^(?:(?:work|professional|employment|career|job|industry|relevant|technical|corporate|research)\s+(?:experience|history|background|record)|experience|employment|work\s+history|career\s+history|job\s+history|internships?(?:\s+experience)?|positions?\s+held|professional\s+background)$/i,
  },
  {
    target: "experience",
    type: ExperienceType.Volunteer,
    pattern:
      /^(?:volunteer(?:ing)?(?:\s+(?:experience|work|service))?|community\s+service|social\s+service|social\s+work|ngo\s+(?:experience|work))$/i,
  },
  {
    target: "experience",
    type: ExperienceType.Leadership,
    pattern:
      /^(?:leadership(?:\s+(?:experience|roles?|positions?))?|positions?\s+of\s+responsibility|responsibilities|student\s+leadership)$/i,
  },
  {
    target: "experience",
    type: ExperienceType.Club,
    pattern:
      /^(?:extra[-\s]?curricular(?:\s+(?:activities|experience))?|co[-\s]?curricular(?:\s+activities)?|clubs?|student\s+organizations?|activities\s+and\s+leadership)$/i,
  },
  {
    target: "projects",
    pattern:
      /^(?:(?:(?:academic|personal|key|major|notable|side|technical|selected|open[-\s]?source|software)\s+)?projects?(?:\s+(?:experience|work))?|project\s+portfolio|portfolio(?:\s+of\s+projects)?|open[-\s]?source(?:\s+contributions?)?)$/i,
  },
  {
    target: "skills",
    pattern:
      /^(?:(?:technical|core|key|professional|software|computer|programming|it|digital)\s+)?(?:(?:skills?|competenc(?:y|ies)|proficienc(?:y|ies)|expertise)(?:\s+(?:and\s+)?(?:tools?|technologies|platforms?|expertise|competenc(?:y|ies)|skills?|summary))?|technologies(?:\s+used)?|tools?(?:\s+(?:and\s+)?(?:technologies|platforms?|skills?))?|platforms?|frameworks?|libraries|tech(?:nology)?\s+stack|skill\s+set|areas?\s+of\s+(?:expertise|interest))$|^(?:programming|technical|computer|software|development)\s+languages?$/i,
  },
  {
    target: "certifications",
    pattern:
      /^(?:certifications?|certificates?|licenses?|licenses?\s+(?:and\s+)?certifications?|certifications?\s+(?:and\s+)?(?:licenses?|courses?|training)|courses?|courses?\s+(?:and\s+)?certifications?|professional\s+(?:development|training)|training(?:\s+(?:and\s+)?certifications?)?|workshops?|credentials?)$/i,
  },
  {
    target: "achievements",
    pattern:
      /^(?:achievements?|awards?|awards?\s+(?:and\s+)?(?:honors?|achievements?)|honors?|honors?\s+(?:and\s+)?awards?|accomplishments?|recognitions?|distinctions?|scholarships?|publications?|patents?|presentations?|conferences?|research|research\s+(?:work|papers?|publications?)|hobbies|interests?|hobbies\s+(?:and\s+)?interests?|activities|extracurriculars?)$/i,
  },
  {
    target: "languages",
    pattern:
      /^(?:languages?|language\s+(?:proficienc(?:y|ies)|skills?)|known\s+languages?|linguistic\s+(?:skills?|abilities))$/i,
  },
  { target: "declaration", pattern: /^declaration$/i },
  {
    target: "header",
    pattern:
      /^(?:(?:personal|contact)\s+(?:details?|information|info|profile|data)|contact(?:\s+(?:details?|information|info|me))?)$/i,
  },
  {
    target: "skip",
    pattern: /^references?(?:\s+available)?(?:\s+upon\s+request)?$/i,
  },
];

const LETTER_SPACED_HEADINGS: [string, HeadingMatch][] = [
  ["summary", { target: "summary" }],
  ["professionalsummary", { target: "summary" }],
  ["careersummary", { target: "summary" }],
  ["executivesummary", { target: "summary" }],
  ["profile", { target: "summary" }],
  ["objective", { target: "summary" }],
  ["education", { target: "education" }],
  ["academics", { target: "education" }],
  ["academicbackground", { target: "education" }],
  ["qualifications", { target: "education" }],
  ["experience", { target: "experience" }],
  ["workexperience", { target: "experience" }],
  ["professionalexperience", { target: "experience" }],
  ["employmenthistory", { target: "experience" }],
  ["internships", { target: "experience" }],
  ["internship", { target: "experience" }],
  ["projects", { target: "projects" }],
  ["academicprojects", { target: "projects" }],
  ["personalprojects", { target: "projects" }],
  ["opensource", { target: "projects" }],
  ["skills", { target: "skills" }],
  ["technicalskills", { target: "skills" }],
  ["coreskills", { target: "skills" }],
  ["skillsandtechnologies", { target: "skills" }],
  ["technologies", { target: "skills" }],
  ["certifications", { target: "certifications" }],
  ["certificates", { target: "certifications" }],
  ["certificationsandlicenses", { target: "certifications" }],
  ["licenses", { target: "certifications" }],
  ["courses", { target: "certifications" }],
  ["achievements", { target: "achievements" }],
  ["awards", { target: "achievements" }],
  ["honors", { target: "achievements" }],
  ["awardsandhonors", { target: "achievements" }],
  ["accomplishments", { target: "achievements" }],
  ["publications", { target: "achievements" }],
  ["research", { target: "achievements" }],
  ["hobbies", { target: "achievements" }],
  ["interests", { target: "achievements" }],
  ["activities", { target: "achievements" }],
  ["extracurricularactivities", { target: "experience", type: ExperienceType.Club }],
  ["languages", { target: "languages" }],
  ["declaration", { target: "declaration" }],
  ["leadership", { target: "experience", type: ExperienceType.Leadership }],
  ["volunteer", { target: "experience", type: ExperienceType.Volunteer }],
  ["volunteerexperience", { target: "experience", type: ExperienceType.Volunteer }],
  ["contact", { target: "header" }],
  ["personaldetails", { target: "header" }],
  ["references", { target: "skip" }],
  ["signature", { target: "skip" }],
];

function normalizeHeadingCandidate(line: string): string {
  return line
    .replace(/^(?:[-•▪◦*·]\s+|\d{1,2}[.)]\s+)/, "")
    .replace(/^[\s:═─\u2500-\u257F]+/, "")
    .replace(/[\s:═─\u2500-\u257F]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBulletPrefixed(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^(?:[•▪◦*·‣⁃]|[-–—](?=\s)|\d{1,2}[.)])\s+/.test(trimmed) ||
    /^[•▪◦*·‣⁃]/.test(trimmed)
  );
}

const INLINE_HEADING_BLOCKLIST =
  /^(?:tech(?:nologies|nology)?(?:\s+(?:stack|used))?|stack|built\s+with|tools?\s+used|description|responsibilities|achievements|awards|location|place|date|github|gitlab|linkedin|portfolio|website|url|link|company|organization|organisation|role|position|duration|grade|gpa|cgpa|score|percentage)\b/i;

function matchHeading(rawLine: string, allowInline = true): HeadingMatch | null {
  const candidate = normalizeHeadingCandidate(rawLine);
  if (!candidate) return null;

  const bulleted = isBulletPrefixed(rawLine);

  const exact = matchExactHeading(candidate);
  if (exact) return exact;

  if (allowInline) {
    const colon = candidate.indexOf(":");
    if (colon > 0 && colon < candidate.length - 1) {
      const head = candidate.slice(0, colon).trim();
      const inline = candidate.slice(colon + 1).trim();
      const match = INLINE_HEADING_BLOCKLIST.test(head) ? null : matchExactHeading(head);
      if (match && inline && !bulleted) return { ...match, inline };
    }

    const dash = candidate.match(/^(.{2,50}?)\s-\s+(.+)$/);
    if (dash && !INLINE_HEADING_BLOCKLIST.test(dash[1].trim())) {
      const match = matchExactHeading(dash[1].trim());
      if (match && dash[2].trim() && !bulleted) return { ...match, inline: dash[2].trim() };
    }
  }

  return null;
}

function matchExactHeading(candidate: string): HeadingMatch | null {
  const heading = candidate
    .replace(/^(?:section|part)\s*\d+\s*[:.\-]?\s*/i, "")
    .replace(/^\d{1,2}[.)]\s+/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();

  if (!heading || heading.length > 60) return null;

  const words = heading.split(/\s+/);

  if (words.length >= 3) {
    const shortRatio = words.filter((word) => word.length <= 2).length / words.length;
    if (shortRatio >= 0.6) {
      const collapsed = words.join("").toLowerCase();
      const found = LETTER_SPACED_HEADINGS.find(([key]) => key === collapsed);
      if (found) return found[1];
    }
  }

  if (words.length > 6) return null;

  for (const rule of HEADING_RULES) {
    if (rule.pattern.test(heading)) {
      return { target: rule.target, type: rule.type };
    }
  }

  return null;
}

interface SectionCapture {
  target: ReorderableSectionId | "header" | "skip";
  type?: ExperienceType;
  lines: string[];
}

interface SplitSections {
  header: string[];
  captures: SectionCapture[];
  order: ReorderableSectionId[];
}

function splitIntoSections(text: string): SplitSections {
  const lines = normalizeLines(text);
  const header: string[] = [];
  const captures: SectionCapture[] = [];
  const order: ReorderableSectionId[] = [];
  let current: SectionCapture | null = null;
  let inHeader = true;

  for (const line of lines) {
    const currentTarget: string = current?.target ?? "";
    const inContentSection: boolean =
      currentTarget !== "" &&
      ["skills", "projects", "experience", "certifications", "achievements"].includes(currentTarget);
    const trailingColonLabel: boolean = inContentSection && /:\s*$/.test(line.trim());
    let heading = trailingColonLabel ? null : matchHeading(line, currentTarget !== "skills");
    if (heading && inContentSection && heading.target === currentTarget) heading = null;

    if (heading) {
      if (heading.target === "skip") {
        current = { target: "skip", lines: [] };
        inHeader = false;
        continue;
      }

      if (heading.target === "header") {
        current = { target: "header", lines: [] };
        if (heading.inline) current.lines.push(heading.inline);
        inHeader = false;
        continue;
      }

      current = {
        target: heading.target,
        type: heading.type,
        lines: heading.inline ? [heading.inline] : [],
      };
      captures.push(current);
      inHeader = false;

      if (!order.includes(heading.target)) order.push(heading.target);
      continue;
    }

    if (!current) {
      if (inHeader) header.push(line);
      continue;
    }

    if (current.target === "header") {
      current.lines.push(line);
      continue;
    }

    if (current.target === "skip") continue;
    current.lines.push(line);
  }

  for (const capture of captures) {
    capture.lines = trimEdgeBlankLines(capture.lines);
  }

  const extraHeader = captures.find((capture) => capture.target === "header");
  if (extraHeader) header.push(...extraHeader.lines);

  return {
    header: trimEdgeBlankLines(header),
    captures,
    order,
  };
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3,5}[\s.\-]?\d{3,5}(?:\s*(?:ext|x)\.?\s*\d{1,5})?/gi;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,<>"')]+/gi;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s,<>"')]+/gi;
const URL_RE =
  /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+(?:\/[^\s,<>"')]*)?/gi;
const EMAIL_TEST_RE = new RegExp(EMAIL_RE.source, "i");
const PHONE_TEST_RE = new RegExp(PHONE_RE.source, "i");
const LINKEDIN_TEST_RE = new RegExp(LINKEDIN_RE.source, "i");
const GITHUB_TEST_RE = new RegExp(GITHUB_RE.source, "i");
const URL_TEST_RE = new RegExp(URL_RE.source, "i");
const LOCATION_RE =
  /^[A-Za-z][A-Za-z.'\- ]{1,32}(?:,\s*[A-Za-z][A-Za-z.'\- ]{1,32}){1,2}$/;
const KNOWN_LOCATION_RE =
  /^(?:bengaluru|bangalore|mumbai|new delhi|delhi|gurugram|gurgaon|noida|hyderabad|pune|chennai|kolkata|ahmedabad|jaipur|indore|coimbatore|kochi|cochin|thiruvananthapuram|trivandrum|chandigarh|lucknow|nagpur|surat|vadodara|mysuru|mysore|mangaluru|mangalore|bhubaneswar|visakhapatnam|vijayawada|tiruchirappalli|trichy|madurai|warangal|gwalior|jodhpur|patna|ranchi|raipur|dehradun|goa|london|new york|san francisco|seattle|boston|austin|chicago|los angeles|toronto|vancouver|berlin|munich|paris|amsterdam|dublin|singapore|dubai|abu dhabi|sydney|melbourne|tokyo|seoul|beijing|shanghai|hong kong|zurich|geneva|stockholm|copenhagen|oslo|helsinki|madrid|barcelona|lisbon|rome|milan|warsaw|prague|vienna|brussels|bangkok|kuala lumpur|jakarta|manila|hanoi|tel aviv|riyadh|doha|karachi|lahore|dhaka|colombo|kathmandu|india|usa|united states|united kingdom|uk|canada|australia|germany|france|netherlands|ireland|uae|united arab emirates|japan|south korea|china|switzerland|sweden|denmark|norway|finland|spain|italy|portugal|poland|czech republic|austria|belgium|thailand|malaysia|indonesia|philippines|vietnam|israel|saudi arabia|qatar|pakistan|bangladesh|sri lanka|new zealand|brazil|mexico|argentina|south africa|nigeria|kenya|egypt)$/i;

const NAME_REJECT_RE =
  /\b(resume|curriculum|vitae|profile|summary|objective|engineer|developer|designer|manager|analyst|architect|scientist|consultant|intern|student|specialist|lead|director|officer|executive|administrator|associate|assistant|coordinator|recruiter|portfolio|linkedin|github|email|phone|contact|university|college|institute|school)\b/i;

const INSTITUTION_RE =
  /\b(university|college|institute|school|academy|polytechnic|iit|nit|iiit|vit|bits|mit|campus)\b/i;
const DEGREE_RE =
  /\b(b\.?\s?tech|b\.?\s?e\.?|b\.?\s?sc|b\.?\s?s\.?|b\.?\s?a\.?|b\.?\s?com|b\.?\s?c\.?\s?a|b\.?\s?b\.?\s?a|m\.?\s?tech|m\.?\s?e\.?|m\.?\s?sc|m\.?\s?s\.?|m\.?\s?a\.?|m\.?\s?com|m\.?\s?b\.?\s?a|mba|mca|bca|ph\.?\s?d|doctorate|diploma|bachelor(?:'s)?|master(?:'s)?|high\s+school|higher\s+secondary|secondary\s+school|12th|10th|hsc|ssc|cbse|icse|intermediate|associate(?:'s)?)\b/i;
const BRANCH_RE =
  /\b(computer science(?: and engineering)?|information technology|information science|electronics(?: and communication)?|electrical(?: and electronics)?|mechanical|civil|chemical|biotechnology|bioinformatics|data science|artificial intelligence(?: and machine learning)?|machine learning|software engineering|information systems|computer engineering|mathematics|physics|chemistry|economics|business administration|commerce|arts|law|medicine|nursing|pharmacy|architecture|instrumentation|aerospace|automobile|mining|petroleum|environmental|food technology)\b/i;
const GPA_RE =
  /(?:CGPA|GPA)\s*[:\-]?\s*\d+(?:\.\d+)?(?:\s*(?:\/|out of)\s*\d+(?:\.\d+)?)?|\d+(?:\.\d+)?\s*(?:\/|out of)\s*\d+(?:\.\d+)?\s*(?:CGPA|GPA)|\d+(?:\.\d+)?\s*(?:CGPA|GPA)|\d+(?:\.\d+)?\s*%|(?:First|Second|Third)\s+Class(?:\s+with\s+Distinction)?|(?:Distinction|Merit)/gi;
const COMPANY_RE =
  /\b(inc|llc|ltd|limited|pvt|private|corp|corporation|technologies|technology|solutions|systems|labs?|services|consulting|group|studio|agency|foundation|organization|company|enterprises?|industries|ventures?|startup|department)\b/i;
const ROLE_RE =
  /\b(engineer|developer|designer|manager|analyst|architect|scientist|consultant|intern|lead|director|president|vice\s+president|head|coordinator|specialist|officer|executive|administrator|associate|assistant|researcher|teacher|professor|trainee|apprentice|freelancer|founder|co[-\s]?founder|owner|partner|recruiter|strategist|member|secretary|treasurer|chairperson|sde|swe|qa|hr|ui\/ux)\b/i;

const MONTH_SRC =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const YEAR_SRC = "(?:19|20)\\d{2}";
const DATE_TOKEN_SRC = `(?:(?:${MONTH_SRC})[\\s.,'/-]*${YEAR_SRC}|(?:1[0-2]|0?[1-9])(?![\\d])[\\s./-]${YEAR_SRC}|${YEAR_SRC}[\\s./-](?:1[0-2]|0?[1-9])(?![\\d])|${YEAR_SRC})`;
const DATE_RANGE_GLOBAL_RE = new RegExp(
  `(?:${DATE_TOKEN_SRC}|${MONTH_SRC})\\s*(?:-|to|until|till)\\s*(?:${DATE_TOKEN_SRC}|Present|Current|Now|Till\\s+date|Ongoing)`,
  "gi"
);
const DATE_TOKEN_GLOBAL_RE = new RegExp(DATE_TOKEN_SRC, "gi");
const PRESENT_RE = /\b(present|current|now|till\s+date|ongoing)\b/i;

interface DateRange {
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  current: boolean;
}

function normalizeMonth(raw: string): string {
  if (!raw) return "";
  const value = raw.trim().toLowerCase();
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[numeric - 1];
  }
  const map: Record<string, string> = {
    january: "Jan", february: "Feb", march: "Mar", april: "Apr",
    may: "May", june: "Jun", july: "Jul", august: "Aug",
    september: "Sep", october: "Oct", november: "Nov", december: "Dec",
    jan: "Jan", feb: "Feb", mar: "Mar", apr: "Apr",
    jun: "Jun", jul: "Jul", aug: "Aug", sep: "Sep", sept: "Sep",
    oct: "Oct", nov: "Nov", dec: "Dec",
  };
  return map[value.slice(0, 4)] ?? map[value.slice(0, 3)] ?? "";
}

function parseDateToken(token: string): { month: string; year: string } {
  const clean = token.trim();
  const monthYear = clean.match(
    new RegExp(`^(${MONTH_SRC})[\\s.,'-]*(${YEAR_SRC})$`, "i")
  );
  if (monthYear) return { month: normalizeMonth(monthYear[1]), year: monthYear[2] };

  const numeric = clean.match(/^(0?[1-9]|1[0-2])[\s./-]((?:19|20)\d{2})$/);
  if (numeric) return { month: normalizeMonth(numeric[1]), year: numeric[2] };

  const yearFirst = clean.match(/^((?:19|20)\d{2})[\s./-](0?[1-9]|1[0-2])$/);
  if (yearFirst) return { month: normalizeMonth(yearFirst[2]), year: yearFirst[1] };

  const year = clean.match(/(19|20)\d{2}/);
  return { month: "", year: year?.[0] ?? "" };
}

function extractDateRange(text: string): DateRange {
  const range = text.match(
    new RegExp(
      `(${DATE_TOKEN_SRC})\\s*(?:-|to|until|till)\\s*(${DATE_TOKEN_SRC}|Present|Current|Now|Till\\s+date|Ongoing)`,
      "i"
    )
  );

  if (range) {
    const start = parseDateToken(range[1]);
    const endText = range[2];
    const current = PRESENT_RE.test(endText);
    const end = current ? { month: "", year: "" } : parseDateToken(endText);
    return {
      startMonth: start.month,
      startYear: start.year,
      endMonth: end.month,
      endYear: end.year,
      current,
    };
  }

  const tokens = matchAll(text, DATE_TOKEN_GLOBAL_RE)
    .map((token) => parseDateToken(token))
    .filter((token) => token.year);
  const current = PRESENT_RE.test(text);

  if (tokens.length === 0) {
    return { startMonth: "", startYear: "", endMonth: "", endYear: "", current };
  }

  if (tokens.length === 1) {
    return {
      startMonth: current ? tokens[0].month : "",
      startYear: current ? tokens[0].year : "",
      endMonth: current ? "" : tokens[0].month,
      endYear: current ? "" : tokens[0].year,
      current,
    };
  }

  return {
    startMonth: tokens[0].month,
    startYear: tokens[0].year,
    endMonth: tokens[tokens.length - 1].month,
    endYear: tokens[tokens.length - 1].year,
    current,
  };
}

function stripDateTokens(line: string): string {
  return cleanField(
    line
      .replace(DATE_RANGE_GLOBAL_RE, " ")
      .replace(DATE_TOKEN_GLOBAL_RE, " ")
      .replace(/\b(?:expected|graduated?|graduation|since|from|to|until|till)\b/gi, " ")
  );
}

function cleanField(value: string): string {
  return cleanWhitespace(
    value
      .replace(/^[\s\-–—|•,:;]+/, "")
      .replace(/[\s\-–—|•,:;]+$/, "")
      .replace(/\s*\|\s*$/g, "")
  );
}

function matchAll(text: string, regex: RegExp): string[] {
  const global = new RegExp(
    regex.source,
    regex.flags.includes("g") ? regex.flags : `${regex.flags}g`
  );
  return Array.from(text.matchAll(global)).map((match) => match[0]);
}

function stripUrlPunctuation(value: string): string {
  return value
    .trim()
    .replace(/^[([{<]+/, "")
    .replace(/[.,;:!?\])}>'"]+$/, "");
}

function extractFirst(text: string, regex: RegExp): string {
  const match = matchAll(text, regex)[0] ?? "";
  return match;
}

function extractPhone(text: string): string {
  for (const candidate of matchAll(text, PHONE_RE)) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) return cleanWhitespace(candidate);
  }
  return "";
}

function splitHeaderTokens(lines: string[]): string[] {
  const tokens: string[] = [];
  for (const line of lines) {
    const parts = line.split(/\s*(?:\||•|·|;|\t)\s*|\s{3,}/);
    for (const part of parts) {
      const token = cleanWhitespace(part);
      if (token) tokens.push(token);
    }
  }
  return tokens;
}

function isLikelyLocation(value: string): boolean {
  const token = cleanField(
    value.replace(/^(?:location|address|based\s+in)\s*[:\-]\s*/i, "")
  );
  if (!token || token.length > 70) return false;
  if (EMAIL_TEST_RE.test(token) || PHONE_TEST_RE.test(token)) return false;
  if (URL_TEST_RE.test(token)) return false;
  if (INSTITUTION_RE.test(token) || COMPANY_RE.test(token)) return false;
  if (DEGREE_RE.test(token) || ROLE_RE.test(token)) return false;
  if (/\d{3,}/.test(token)) return false;
  return LOCATION_RE.test(token);
}

function isLocationToken(value: string): boolean {
  const token = cleanField(
    value.replace(/^(?:location|address|based\s+in)\s*[:\-]\s*/i, "")
  );
  if (!token || token.length > 70) return false;
  if (isLikelyLocation(token)) return true;
  if (EMAIL_TEST_RE.test(token) || PHONE_TEST_RE.test(token) || URL_TEST_RE.test(token)) return false;
  if (INSTITUTION_RE.test(token) || COMPANY_RE.test(token)) return false;
  if (DEGREE_RE.test(token) || ROLE_RE.test(token)) return false;
  if (/\d{3,}/.test(token)) return false;
  const normalized = token
    .toLowerCase()
    .replace(/[().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (KNOWN_LOCATION_RE.test(normalized)) return true;
  return /^(?:remote|hybrid|onsite|on-site)(?:\s+(?:in|from)?\s*[a-z][a-z .'-]*)?$/.test(normalized);
}

const US_STATE_ABBREVIATIONS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

function isStandaloneLocation(value: string): boolean {
  const token = cleanField(
    value.replace(/^(?:location|address|based\s+in)\s*[:\-]\s*/i, "")
  );
  if (!token) return false;
  if (!token.includes(",")) return isLocationToken(token);
  if (!isLikelyLocation(token)) return false;
  const parts = token.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (isLocationToken(first)) return true;
  return US_STATE_ABBREVIATIONS.has(last.toUpperCase());
}

function scoreNameCandidate(value: string, index: number): number {
  const line = cleanField(value.replace(/^(?:name)\s*[:\-]\s*/i, ""));
  if (!line || line.length > 55) return -100;
  if (EMAIL_TEST_RE.test(line) || extractPhone(line)) return -100;
  if (URL_TEST_RE.test(line) || LINKEDIN_TEST_RE.test(line) || GITHUB_TEST_RE.test(line)) return -100;
  if (matchHeading(line)) return -100;
  if (NAME_REJECT_RE.test(line)) return -100;
  if (/\d/.test(line)) return -100;
  if (isLikelyLocation(line)) return -100;

  const commaParts = line.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length > 2) return -100;
  if (commaParts.length === 2 && commaParts.some((part) => part.split(/\s+/).length > 2)) {
    return -100;
  }

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return -100;
  if (!/^[A-Za-z][A-Za-z.'\- ]*(?:,\s*[A-Za-z][A-Za-z.'\- ]*)?$/.test(line)) return -100;

  const alphaCount = (line.match(/[A-Za-z]/g) ?? []).length;
  if (alphaCount / line.length < 0.8) return -100;

  let score = 0;
  if (words.length >= 2 && words.length <= 3) score += 3;
  else if (words.length === 4) score += 2;
  else if (words.length === 5) score += 1;
  if (commaParts.length === 1) score += 1;
  if (line === line.toUpperCase()) score += 1;
  score += Math.max(0, 6 - index);
  return score;
}

function extractName(headerLines: string[]): string {
  const candidates = splitHeaderTokens(headerLines);
  let best = "";
  let bestScore = -100;
  candidates.forEach((candidate, index) => {
    const score = scoreNameCandidate(candidate, index);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return bestScore > 0 ? cleanField(best) : "";
}

function extractLocation(headerLines: string[]): string {
  const tokens = splitHeaderTokens(headerLines);
  for (const token of tokens) {
    if (isLocationToken(token)) {
      return cleanField(token.replace(/^(?:location|address|based\s+in)\s*[:\-]\s*/i, ""));
    }
  }
  return "";
}

function extractProfileUrl(text: string, regex: RegExp): string {
  const value = stripUrlPunctuation(extractFirst(text, regex));
  return value ? normalizeProfileUrl(value) : "";
}

function extractPortfolio(headerLines: string[]): string {
  const text = headerLines.join("\n").replace(EMAIL_RE, " ");
  const candidates = matchAll(text, URL_RE).map(stripUrlPunctuation);
  for (const candidate of candidates) {
    if (LINKEDIN_TEST_RE.test(candidate) || GITHUB_TEST_RE.test(candidate)) continue;
    const clean = normalizeProfileUrl(candidate);
    if (clean && clean.includes(".") && !clean.includes("@")) return clean;
  }
  return "";
}

function extractPersonal(headerLines: string[], fullText: string): Resume["personal"] {
  const headerText = headerLines.join("\n");
  const email = (extractFirst(headerText, EMAIL_RE) || extractFirst(fullText, EMAIL_RE))
    .trim()
    .toLowerCase();

  return {
    fullName: extractName(headerLines),
    email,
    phone: extractPhone(headerText) || extractPhone(fullText),
    location: extractLocation(headerLines),
    linkedin: extractProfileUrl(headerText, LINKEDIN_RE),
    github: extractProfileUrl(headerText, GITHUB_RE),
    portfolio: extractPortfolio(headerLines),
  };
}

const BULLET_RE = /^(?:[•▪◦*·‣⁃]|[-–—](?=\s)|\d{1,2}[.)])\s*/;

function splitListItems(raw: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of raw) {
    if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);

    if (depth === 0 && /[,;|•·]/.test(char)) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  items.push(current);
  return items.map((item) => item.trim()).filter(Boolean);
}

const BODY_START_RE =
  /^(?:built|building|developed|developing|designed|implemented|improved|engineered|launched|maintained|automated|migrated|collaborated|worked|responsible|achieved|conducted|analyzed|analysed|delivered|optimized|optimised|reduced|increased|mentored|supported|contributed|assisted|coordinated|owned|spearheaded|streamlined|created|shipped|deployed|integrated)\b/i;

function isBulletLine(line: string): boolean {
  return BULLET_RE.test(line.trim());
}

function stripBullet(line: string): string {
  return line.replace(BULLET_RE, "").trim();
}

function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line === "") {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

function looksLikeHeaderLine(line: string): boolean {
  if (!line || isBulletLine(line)) return false;
  if (line.length > 120) return false;
  if (isUrlOnlyLine(line) || isLikelyLocation(line)) return false;
  if (/^(?:tech(?:nologies|nology)?(?:\s+stack)?|skills?|tools?|description|responsibilities|achievements?|gpa|cgpa|grade|score|percentage|marks|coursework|relevant\s+coursework|location|place|date|email|phone)\b\s*:?/i.test(line)) {
    return false;
  }
  return true;
}

function hasDateSignal(line: string): boolean {
  const dates = extractDateRange(line);
  return dates.startYear !== "" || dates.endYear !== "";
}

function looksLikeEducationHeader(line: string): boolean {
  return hasDateSignal(line) || DEGREE_RE.test(line) || INSTITUTION_RE.test(line);
}

function looksLikeExperienceHeader(line: string): boolean {
  return (
    hasDateSignal(line) ||
    ROLE_RE.test(line) ||
    COMPANY_RE.test(line) ||
    INSTITUTION_RE.test(line)
  );
}

function looksLikeCertificationHeader(line: string): boolean {
  return (
    hasDateSignal(line) ||
    /certif|course|license|credential|training|workshop|nanodegree/i.test(line)
  );
}

function looksLikeProjectTitle(line: string): boolean {
  if (!looksLikeHeaderLine(line) || isUrlOnlyLine(line)) return false;
  if (/[.!?]$/.test(line) || BODY_START_RE.test(line)) return false;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 12) return false;
  const alphaWords = words.filter((word) => /^[A-Za-z]/.test(word));
  if (alphaWords.length === 0) return false;
  const capitalized = alphaWords.filter((word) => /^[A-Z]/.test(word)).length;
  return capitalized / alphaWords.length > 0.5;
}

function isPlausibleEntry(block: string[], kind: "education" | "experience" | "projects" | "certifications"): boolean {
  const lines = block.filter(Boolean);
  if (lines.length === 0) return false;
  if (isBulletLine(lines[0])) return false;
  const head = lines.slice(0, 4).join(" ");

  if (kind === "education") {
    return DEGREE_RE.test(head) || INSTITUTION_RE.test(head) || extractDateRange(head).startYear !== "" || extractDateRange(head).endYear !== "";
  }
  if (kind === "experience") {
    return (
      ROLE_RE.test(head) ||
      COMPANY_RE.test(head) ||
      extractDateRange(head).startYear !== "" ||
      extractDateRange(head).endYear !== ""
    );
  }
  if (kind === "certifications") {
    return /certif|course|license|credential|training|workshop|nanodegree/i.test(head) ||
      extractDateRange(head).startYear !== "" ||
      extractDateRange(head).endYear !== "";
  }
  return (
    matchAll(lines[0], URL_RE).length > 0 ||
    (lines.length > 1 && looksLikeProjectTitle(lines[0])) ||
    (looksLikeHeaderLine(lines[0]) && lines.slice(1).some((line) => isBulletLine(line)))
  );
}

function mergeEntryBlocks(
  blocks: string[][],
  kind: "education" | "experience" | "projects" | "certifications"
): string[][] {
  const merged: string[][] = [];
  for (const block of blocks) {
    if (merged.length === 0 || isPlausibleEntry(block, kind)) {
      merged.push([...block]);
    } else {
      merged[merged.length - 1].push(...block);
    }
  }
  return merged;
}

function splitByDateAnchors(
  lines: string[],
  kind: "education" | "experience" | "certifications"
): string[][] {
  const anchors: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || isBulletLine(line) || line.length > 140) continue;
    if (kind !== "certifications" && /[.!?]$/.test(line)) continue;
    const dates = extractDateRange(line);
    const hasDate = dates.startYear !== "" || dates.endYear !== "";
    const singleYear = /\b(?:19|20)\d{2}\b/.test(line);
    if (kind === "certifications") {
      const remainder = cleanField(
        stripDateTokens(line).replace(
          /^(?:issued?|issue\s+date|date|credential\s+id|license\s+id|valid(?:\s+until|\s+through|\s+from)?|expires?|expiry)\b/i,
          " "
        )
      );
      if (!remainder || remainder.split(/\s+/).filter(Boolean).length <= 1) continue;
    }
    if (hasDate || (kind === "certifications" && singleYear)) {
      anchors.push(i);
    }
  }

  if (anchors.length < 2) return [];

  const starts: number[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const previousAnchor = i > 0 ? anchors[i - 1] : -1;
    let start = anchor;

    for (let back = 1; back <= 3; back++) {
      const candidateIndex = anchor - back;
      if (candidateIndex <= previousAnchor) break;
      const candidate = lines[candidateIndex];
      if (!candidate || isBulletLine(candidate)) break;
      if (candidate.length > 100) break;
      if (/[.!?]$/.test(candidate)) break;
      if (extractDateRange(candidate).startYear !== "" || extractDateRange(candidate).endYear !== "") break;
      start = candidateIndex;
    }

    if (i === 0) start = 0;
    if (starts.length === 0 || start > starts[starts.length - 1]) starts.push(start);
  }

  if (starts.length < 2) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length;
    const chunk = lines.slice(starts[i], end);
    if (chunk.some(Boolean)) chunks.push(chunk);
  }
  return chunks;
}

function isUrlOnlyLine(line: string): boolean {
  if (!line || !URL_TEST_RE.test(line)) return false;
  const remainder = cleanField(
    line
      .replace(URL_RE, " ")
      .replace(EMAIL_RE, " ")
      .replace(/[|•·,;()\[\]]/g, " ")
  );
  return remainder.length === 0;
}

function splitByHeaderBoundaries(
  lines: string[],
  kind: "education" | "experience" | "projects" | "certifications"
): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const previous = current[current.length - 1] ?? "";

    const startsProject =
      kind === "projects" &&
      URL_TEST_RE.test(line) &&
      !isUrlOnlyLine(line) &&
      !/^(?:tech(?:nologies|nology)?(?:\s+stack)?|tools?|built\s+with)\b/i.test(line);
    const previousIsProjectLink = kind === "projects" && isUrlOnlyLine(previous);

    const endsPreviousEntry =
      isBulletLine(previous) ||
      /[.!?]$/.test(previous) ||
      extractDateRange(previous).startYear !== "" ||
      extractDateRange(previous).endYear !== "";

    const looksLikeDescription =
      /[.!?]$/.test(line) || BODY_START_RE.test(line);
    const hasHeaderSignal =
      kind === "education"
        ? looksLikeEducationHeader(line)
        : kind === "experience"
          ? looksLikeExperienceHeader(line)
          : kind === "certifications"
            ? looksLikeCertificationHeader(line)
            : true;
    const newEntry =
      current.length > 0 &&
      line !== "" &&
      !isBulletLine(line) &&
      !looksLikeDescription &&
      looksLikeHeaderLine(line) &&
      (startsProject ||
        ((hasHeaderSignal && endsPreviousEntry) || previousIsProjectLink) &&
          (kind === "projects" ? previousIsProjectLink || looksLikeProjectTitle(line) : true));

    if (newEntry) {
      chunks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length) chunks.push(current);
  return chunks;
}

function segmentEntries(
  lines: string[],
  kind: "education" | "experience" | "projects" | "certifications"
): string[][] {
  const cleaned = trimEdgeBlankLines(lines);
  if (cleaned.length === 0) return [];

  const blocks = splitBlocks(cleaned).filter((block) => block.length > 0);
  if (blocks.length > 1) {
    const merged = mergeEntryBlocks(blocks, kind);
    if (merged.length > 1) return merged;
  }

  if (kind !== "projects") {
    const byDates = splitByDateAnchors(cleaned, kind);
    if (byDates.length > 1) return byDates;
  }

  const byHeaders = splitByHeaderBoundaries(cleaned, kind);
  if (byHeaders.length > 1) return byHeaders;

  if (blocks.length > 1) return blocks;
  return [cleaned];
}

function entryHeaderText(chunk: string[]): string {
  const headerLines: string[] = [];
  for (const line of chunk) {
    if (!line) continue;
    if (isBulletLine(line)) break;
    headerLines.push(line);
    if (headerLines.length >= 5) break;
  }
  return headerLines.join(" ");
}

function findGrade(lines: string[]): string {
  for (const line of lines) {
    const match = matchAll(line, GPA_RE)[0];
    if (match) return cleanWhitespace(match);
  }
  return "";
}

function findBranch(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(BRANCH_RE);
    if (match) return match[0];
  }
  return "";
}

function institutionScore(line: string): number {
  let score = 0;
  if (INSTITUTION_RE.test(line)) score += 4;
  if (/\b(university|college|institute|school|academy|polytechnic)\b/i.test(line)) score += 1;
  if (DEGREE_RE.test(line)) score -= 2;
  if (line.length > 20) score += 1;
  if (line.split(/\s+/).length > 2) score += 1;
  return score;
}

function degreeScore(line: string): number {
  let score = 0;
  if (DEGREE_RE.test(line)) score += 4;
  if (BRANCH_RE.test(line)) score += 1;
  if (INSTITUTION_RE.test(line)) score -= 2;
  return score;
}

function splitEntryParts(line: string): [string, string] | null {
  const at = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (at) return [cleanField(at[1]), cleanField(at[2])];

  const spaced = line.match(/^(.+?)\s+(?:-|\||•)\s+(.+)$/);
  if (spaced) return [cleanField(spaced[1]), cleanField(spaced[2])];

  const comma = line.match(/^([^,]+),\s*(.+)$/);
  if (comma && roleScore(comma[1]) > 0) {
    return [cleanField(comma[1]), cleanField(comma[2])];
  }

  return null;
}

function splitCompositeEducationLine(line: string): { institution: string; degree: string } | null {
  const degreeMatch = line.match(DEGREE_RE);
  const institutionMatch = line.match(INSTITUTION_RE);

  if (degreeMatch?.index !== undefined && institutionMatch?.index !== undefined) {
    const degreeIndex = degreeMatch.index;
    const institutionIndex = institutionMatch.index;
    const splitIndex = degreeIndex > institutionIndex ? degreeIndex : institutionIndex;
    const left = line.slice(0, splitIndex);
    const separator = left.match(/[,|•]\s*$/);
    if (separator) {
      const leftText = cleanField(line.slice(0, (separator.index ?? 0) + 1));
      const rightText = cleanField(line.slice((separator.index ?? 0) + 1));
      if (degreeIndex > institutionIndex) {
        return { institution: leftText, degree: rightText };
      }
      return { institution: rightText, degree: leftText };
    }
  }

  const parts = splitEntryParts(line);
  if (!parts) return null;
  const [a, b] = parts;
  if (!a || !b) return null;

  const aIsDegree = degreeScore(a);
  const bIsDegree = degreeScore(b);
  if (aIsDegree <= 0 && bIsDegree <= 0) return null;

  return aIsDegree >= bIsDegree
    ? { institution: b, degree: a }
    : { institution: a, degree: b };
}

function parseEducationEntry(chunk: string[]): EducationEntry | null {
  const grade = findGrade(chunk);
  const dates = extractDateRange(entryHeaderText(chunk));

  const info = chunk
    .filter((line) => line && !isBulletLine(line))
    .map((line) => stripDateTokens(line))
    .map((line) => cleanField(line.replace(GPA_RE, " ")))
    .filter((line) => line && !/^[:\-|•\s]*$/.test(line))
    .slice(0, 3);

  if (info.length === 0) return null;

  let institution = "";
  let degree = "";

  if (info.length === 1) {
    const composite = splitCompositeEducationLine(info[0]);
    if (composite) {
      institution = composite.institution;
      degree = composite.degree;
    } else if (degreeScore(info[0]) > institutionScore(info[0])) {
      degree = info[0];
    } else {
      institution = info[0];
    }
  } else {
    const composite = splitCompositeEducationLine(info[0]);
    if (composite) {
      institution = composite.institution;
      degree = composite.degree;
    } else {
      const firstDegree = degreeScore(info[0]);
      const secondDegree = degreeScore(info[1]);
      const firstInstitution = institutionScore(info[0]);
      const secondInstitution = institutionScore(info[1]);

      if (firstDegree > firstInstitution && secondInstitution >= secondDegree) {
        degree = info[0];
        institution = info[1];
      } else if (secondDegree > secondInstitution) {
        institution = info[0];
        degree = info[1];
      } else {
        institution = info[0];
        degree = info[1];
      }
    }
  }

  institution = cleanField(institution.replace(/(?:^|\s)(?:institution|college|university|school)\s*[:\-]\s*/i, " "));
  degree = cleanField(degree.replace(/^(?:degree|course|program(?:me)?)\s*[:\-]\s*/i, ""));

  let branch = findBranch([degree, ...info]);
  if (branch && degree.toLowerCase().includes(branch.toLowerCase())) branch = "";
  if (branch && institution.toLowerCase().includes(branch.toLowerCase())) branch = "";

  if (!institution && !degree) return null;

  return {
    id: createId(),
    institution,
    degree,
    branch,
    grade,
    startMonth: dates.startMonth,
    startYear: dates.startYear,
    endMonth: dates.endMonth,
    endYear: dates.endYear,
  };
}

const EXPERIENCE_TYPE_LABELS: [RegExp, ExperienceType][] = [
  [/^(?:full[\s-]?time|fulltime)$/i, ExperienceType.FullTime],
  [/^(?:part[\s-]?time|parttime)$/i, ExperienceType.PartTime],
  [/^(?:intern|internship|interns?hip)$/i, ExperienceType.Internship],
  [/^(?:volunteer|volunteering)$/i, ExperienceType.Volunteer],
  [/^(?:freelance|freelancer|contract|contractor)$/i, ExperienceType.Freelance],
  [/^(?:club|club\s+experience|student\s+club)$/i, ExperienceType.Club],
  [/^(?:leadership|lead)$/i, ExperienceType.Leadership],
];

function detectExplicitExperienceType(line: string): ExperienceType | null {
  const cleaned = cleanWhitespace(
    line.replace(/^(?:type|employment\s+type|job\s+type)\s*[:\-]\s*/i, "")
  );
  for (const [regex, type] of EXPERIENCE_TYPE_LABELS) {
    if (regex.test(cleaned)) return type;
  }
  return null;
}

function inferExperienceType(role: string, organization: string, description: string): ExperienceType {
  const corpus = `${role} ${organization} ${description}`.toLowerCase();
  if (/\bintern\b/.test(corpus)) return ExperienceType.Internship;
  if (/\bvolunteer\b|\bvolunteering\b|\bngo\b/.test(corpus)) return ExperienceType.Volunteer;
  if (/\bfreelance\b|\bfreelancer\b|\bcontract\b|\bconsultant\b/.test(corpus)) return ExperienceType.Freelance;
  if (/\bpart[\s-]time\b/.test(corpus)) return ExperienceType.PartTime;
  if (/\bclub\b|\bsociety\b|\bcommittee\b|\bcell\b/.test(corpus)) return ExperienceType.Club;
  if (/\bpresident\b|\bchairperson\b|\bhead\b|\blead\b|\bleader\b/.test(corpus)) return ExperienceType.Leadership;
  return ExperienceType.FullTime;
}

function roleScore(line: string): number {
  let score = 0;
  if (ROLE_RE.test(line)) score += 4;
  if (/\b(?:senior|junior|sr\.?|jr\.?|associate|assistant|principal|staff)\b/i.test(line)) score += 1;
  if (COMPANY_RE.test(line)) score -= 2;
  if (isLikelyLocation(line)) score -= 3;
  return score;
}

function organizationScore(line: string): number {
  let score = 0;
  if (COMPANY_RE.test(line)) score += 3;
  if (INSTITUTION_RE.test(line)) score += 2;
  if (ROLE_RE.test(line)) score -= 2;
  if (isLikelyLocation(line)) score -= 3;
  if (!ROLE_RE.test(line) && line.split(/\s+/).length <= 6) score += 1;
  return score;
}

interface Candidate {
  text: string;
  role: number;
  org: number;
  index: number;
}

function buildRoleCandidates(headerInfo: string[]): Candidate[] {
  const candidates: Candidate[] = [];
  headerInfo.forEach((line, index) => {
    const parts = splitEntryParts(line);
    const add = (text: string) => {
      const clean = cleanField(text);
      if (!clean || isStandaloneLocation(clean)) return;
      candidates.push({
        text: clean,
        role: roleScore(clean),
        org: organizationScore(clean),
        index: candidates.length,
      });
    };

    if (parts && (roleScore(parts[0]) > 0 || organizationScore(parts[0]) > 0 || roleScore(parts[1]) > 0 || organizationScore(parts[1]) > 0)) {
      add(parts[0]);
      add(parts[1]);
    } else {
      add(line);
    }
    void index;
  });
  return candidates;
}

function pickRoleAndOrganization(candidates: Candidate[]): { role: string; organization: string } {
  if (candidates.length === 0) return { role: "", organization: "" };
  if (candidates.length === 1) {
    const only = candidates[0];
    if (only.org > only.role) return { role: "", organization: only.text };
    return { role: only.text, organization: "" };
  }

  let best: { role: Candidate; org: Candidate; score: number } | null = null;
  for (const role of candidates) {
    for (const org of candidates) {
      if (role === org) continue;
      const score = role.role + org.org + (role.index < org.index ? 0.5 : 0);
      if (!best || score > best.score) best = { role, org, score };
    }
  }

  if (!best || best.score <= 0) {
    return { role: candidates[0].text, organization: candidates[1].text };
  }

  return { role: best.role.text, organization: best.org.text };
}

function formatDescription(lines: string[]): string {
  const items: { text: string; bullet: boolean }[] = [];
  let paragraph = "";
  let bullet = false;

  const flush = () => {
    const text = cleanWhitespace(paragraph);
    if (text) items.push({ text, bullet });
    paragraph = "";
    bullet = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (isBulletLine(line)) {
      flush();
      bullet = true;
      paragraph = stripBullet(line);
      continue;
    }
    if (
      paragraph &&
      (/[.!?]$/.test(paragraph) || isTechListLine(paragraph) || isTechListLine(line))
    ) {
      flush();
    }
    if (paragraph) paragraph = `${paragraph} ${line}`;
    else {
      bullet = false;
      paragraph = line;
    }
  }
  flush();

  return items
    .map((item) => (item.bullet ? `• ${item.text}` : item.text))
    .join("\n");
}

const TECH_INDICATORS =
  /\b(?:react(?:\s+native)?|angular|vue|next\.?js|nuxt|svelte|node\.?js|express(?:\.js)?|django|flask|spring(?:\s+boot)?|fastapi|rails|laravel|flutter|dart|python|typescript|javascript|java|c\+\+|c#|\.net|go|golang|rust|ruby|php|swift|kotlin|scala|postgresql|postgres|mysql|sqlite|mongodb|redis|graphql|rest(?:\s+api)?|docker|kubernetes|aws|gcp|azure|firebase|supabase|tailwind(?:\s+css)?|bootstrap|html5?|css3?|sass|webpack|vite|git|github|gitlab|tensorflow|pytorch|scikit-learn|pandas|numpy|opencv|openai|langchain|socket\.io|websocket|oauth|jwt|stripe|vercel|netlify|prisma|sequelize|figma|postman|jira)\b/gi;

function looksLikeTechList(line: string): boolean {
  if (!line || ROLE_RE.test(line) || COMPANY_RE.test(line) || INSTITUTION_RE.test(line)) {
    return false;
  }
  if (hasDateSignal(line) || isStandaloneLocation(line) || detectExplicitExperienceType(line)) {
    return false;
  }
  return matchAll(line, TECH_INDICATORS).length > 0;
}

function isTechListLine(line: string): boolean {
  const matches = matchAll(line, TECH_INDICATORS).length;
  return matches >= 2 || (matches >= 1 && /[,/|+]/.test(line));
}

function stripOrganizationLocation(value: string): string {
  const parts = value
    .split(/\s*(?:,|\||•)\s*|\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  let stripped = false;
  while (parts.length > 1 && isLocationToken(parts[parts.length - 1])) {
    parts.pop();
    stripped = true;
  }
  return stripped ? parts.join(", ") : value;
}

function parseExperienceEntry(chunk: string[], typeOverride?: ExperienceType): ExperienceEntry | null {
  const firstBullet = chunk.findIndex((line) => line && isBulletLine(line));
  const preBullet = firstBullet === -1 ? chunk : chunk.slice(0, firstBullet);
  const headerInfo: string[] = [];
  let bodyStart = firstBullet;

  for (let i = 0; i < preBullet.length; i++) {
    const line = preBullet[i];
    if (!line) {
      if (headerInfo.length > 0) break;
      continue;
    }

    if (headerInfo.length > 0) {
      const lineHasDate =
        extractDateRange(line).startYear !== "" || extractDateRange(line).endYear !== "";
      const lineLooksHeader =
        ROLE_RE.test(line) ||
        COMPANY_RE.test(line) ||
        INSTITUTION_RE.test(line) ||
        isStandaloneLocation(line) ||
        lineHasDate ||
        detectExplicitExperienceType(line) !== null ||
        line.split(/\s+/).filter(Boolean).length <= 3;

      if (
        !lineLooksHeader ||
        looksLikeTechList(line) ||
        BODY_START_RE.test(line) ||
        /[.!?]$/.test(line)
      ) {
        bodyStart = i;
        break;
      }
    }

    if (headerInfo.length >= 6) break;
    headerInfo.push(line);
  }

  if (headerInfo.length === 0) return null;
  if (bodyStart === -1) bodyStart = headerInfo.length;

  const dates = extractDateRange(headerInfo.join(" "));
  let explicitType: ExperienceType | null = null;
  const cleanedHeader: string[] = [];

  for (const line of headerInfo) {
    const withoutDate = stripDateTokens(line);
    if (!withoutDate) continue;
    const type = detectExplicitExperienceType(withoutDate);
    if (type) {
      explicitType = type;
      continue;
    }
    if (isStandaloneLocation(withoutDate)) continue;
    cleanedHeader.push(withoutDate);
  }

  const candidates = buildRoleCandidates(cleanedHeader);
  const picked = pickRoleAndOrganization(candidates);
  const role = picked.role;
  let organization = picked.organization;

  organization = stripOrganizationLocation(organization);

  const bodyLines = chunk.slice(Math.max(bodyStart, 0));
  const description = formatDescription(bodyLines);

  if (!role && !organization && !description) return null;

  const type =
    explicitType ?? typeOverride ?? inferExperienceType(role, organization, description);

  return {
    id: createId(),
    type,
    organization,
    role,
    description,
    startMonth: dates.startMonth,
    startYear: dates.startYear,
    endMonth: dates.endMonth,
    endYear: dates.endYear,
    current: dates.current,
  };
}

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

function extractTechStack(lines: string[]): string {
  const explicit: string[] = [];

  for (const line of lines) {
    const match = line.match(
      /^(?:tech(?:nologies|nology)?(?:\s+(?:stack|used))?|stack|built\s+with|tools?|frameworks?|languages?|databases?)\s*[:\-]\s*(.+)$/i
    );
    if (!match) continue;
    explicit.push(
      ...splitListItems(match[1])
        .map((item) => cleanField(item))
        .filter((item) => item.length > 0 && item.length <= 40)
    );
  }

  if (explicit.length > 0) {
    return dedupeCaseInsensitive(explicit).slice(0, 15).join(", ");
  }

  const inferred: string[] = [];
  for (const line of lines) {
    const text = line.replace(URL_RE, " ").replace(EMAIL_RE, " ");
    const matches = matchAll(text, TECH_INDICATORS);
    inferred.push(...matches.map((match) => match.trim()));
  }

  return dedupeCaseInsensitive(inferred).slice(0, 12).join(", ");
}

function parseProjectEntry(chunk: string[]): ProjectEntry | null {
  const headerLine = chunk.find((line) => line && !isBulletLine(line)) ?? "";
  if (!headerLine) return null;

  const urls = dedupeCaseInsensitive(
    chunk
      .flatMap((line) => matchAll(line, URL_RE))
      .map(stripUrlPunctuation)
      .filter((url) => url.includes("."))
  ).map(normalizeProfileUrl);

  const githubUrl = urls.find((url) => /github\.com/i.test(url)) ?? "";
  const liveUrl = urls.find((url) => url !== githubUrl) ?? "";

  const name = cleanField(
    headerLine
      .replace(URL_RE, " ")
      .replace(/\b(?:github|live|demo|link|website|url)\s*[:\-]?/gi, " ")
  );

  const bodyLines = chunk.filter((line) => line !== headerLine && !isUrlOnlyLine(line));
  const description = formatDescription(
    bodyLines.filter(
      (line) =>
        !/^(?:tech(?:nologies|nology)?(?:\s+(?:stack|used))?|stack|built\s+with|tools?|frameworks?|languages?|databases?)\s*[:\-]/i.test(
          line
        )
    )
  );
  const techStack = extractTechStack(chunk);

  if (!name && !description) return null;

  return {
    id: createId(),
    name,
    description,
    techStack,
    githubUrl,
    liveUrl,
  };
}

function parseCertificationEntry(chunk: string[]): CertificationEntry | null {
  const allText = chunk.join(" ");
  const dates = extractDateRange(allText);
  const year = dates.endYear || dates.startYear;
  const month = dates.endMonth || dates.startMonth;

  let issuedBy = "";
  const info = chunk
    .map((line) => stripDateTokens(line))
    .map(cleanField)
    .filter((line) => {
      if (!line) return false;
      const issuedByMatch = line.match(/^issued\s+by\s+(.+)$/i);
      if (issuedByMatch) {
        if (!issuedBy) issuedBy = cleanField(issuedByMatch[1]);
        return false;
      }
      return !/^(?:issued?|issue\s+date|date|credential\s+id|license\s+id|valid(?:\s+until|\s+through|\s+from)?|expires?|expiry|score|grade)\b/i.test(
        line
      );
    });

  if (info.length === 0) return null;

  let name = "";
  let organization = "";

  if (info.length === 1) {
    const parts = splitEntryParts(info[0]);
    if (parts) {
      const aLooksName = /certif|course|license|credential|training|workshop|nanodegree/i.test(parts[0]);
      const bLooksName = /certif|course|license|credential|training|workshop|nanodegree/i.test(parts[1]);
      if (bLooksName && !aLooksName) {
        name = parts[1];
        organization = parts[0];
      } else {
        name = parts[0];
        organization = parts[1];
      }
    } else {
      name = info[0];
    }
  } else {
    const firstLooksName = /certif|course|license|credential|training|workshop|nanodegree/i.test(info[0]);
    const secondLooksName = /certif|course|license|credential|training|workshop|nanodegree/i.test(info[1]);
    if (secondLooksName && !firstLooksName) {
      name = info[1];
      organization = info[0];
    } else {
      name = info[0];
      organization = info.slice(1).join(", ");
    }
  }

  if (!name) return null;

  return {
    id: createId(),
    name: cleanField(name),
    organization: cleanField(organization || issuedBy),
    month,
    year,
  };
}

function extractAchievementItems(lines: string[]): string[] {
  const items: string[] = [];
  let current = "";

  const flush = () => {
    const text = cleanWhitespace(current);
    if (text.length > 1) items.push(text);
    current = "";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (isBulletLine(line)) {
      flush();
      current = stripBullet(line);
      continue;
    }
    if (!current) {
      current = line;
      continue;
    }
    if (/[.!?]$/.test(current) || /^[A-Z0-9]/.test(line)) {
      flush();
      current = line;
    } else {
      current = `${current} ${line}`;
    }
  }
  flush();

  return dedupeCaseInsensitive(items).slice(0, 40);
}

function extractLanguageItems(lines: string[]): LanguageItem[] {
  const joined = lines
    .map((line) => line.replace(/^(?:languages?|known\s+languages?)\s*[:\-]\s*/i, ""))
    .join(", ");

  const labels = splitListItems(joined)
    .map((item) => cleanField(stripBullet(item)))
    .map((item) => item.replace(/\.$/, "").trim())
    .filter((item) => item.length > 0 && item.length <= 50)
    .filter((item) => !/^(?:and|etc|other|others)$/i.test(item));

  return dedupeCaseInsensitive(labels).slice(0, 25).map((label) => ({
    id: createId(),
    label,
  }));
}

const SKILL_CATEGORY_HINTS: [RegExp, string][] = [
  [
    /\b(python|javascript|typescript|java|c\+\+|c#|go|golang|rust|ruby|php|swift|kotlin|scala|matlab|dart|sql|r)\b/i,
    "languages",
  ],
  [
    /\b(react|angular|vue|next\.?js|nuxt|svelte|django|flask|spring|express|fastapi|rails|laravel|flutter|node\.?js)\b/i,
    "frameworks",
  ],
  [
    /\b(git|github|gitlab|docker|kubernetes|jenkins|terraform|ansible|aws|gcp|azure|linux|bash|npm|yarn|webpack|vite|figma|postman|jira|notion)\b/i,
    "tools",
  ],
];

function slugifyCategory(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseLabel(label: string): string {
  const clean = cleanWhitespace(label).replace(/\s*\/\s*/g, " / ");
  if (clean !== clean.toUpperCase()) return clean;
  return clean
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function categoriseSkill(label: string): string {
  for (const [regex, category] of SKILL_CATEGORY_HINTS) {
    if (regex.test(label)) return category;
  }
  return "other";
}

const SKILL_JUNK_RE = /^(?:and|etc|other|others|advanced|expert|proficient|intermediate|beginner|basic|fluent|native)$/i;
const PROFICIENCY_RE =
  /^(?:advanced|expert|proficient|intermediate|beginner|basic|fluent|native|familiar|working\s+knowledge|strong|excellent|good|very\s+good)(?:\s*\([^)]*\))?$/i;
const CATEGORY_WORD_RE =
  /\b(?:languages?|frameworks?|libraries|tools?|platforms?|databases?|technologies|concepts|skills?|devops|cloud|testing|other|software|operating\s+systems?)\b/i;

function looksLikeProficiencyList(value: string): boolean {
  const parts = splitListItems(value)
    .map((part) => cleanField(part))
    .filter(Boolean);
  return parts.length > 0 && parts.every((part) => PROFICIENCY_RE.test(part));
}

function parseSkills(lines: string[]): { skills: SkillItem[]; categories: SkillCategoryConfig[] } {
  const skills: SkillItem[] = [];
  const categories: SkillCategoryConfig[] = [];
  const seenSkills = new Set<string>();
  const seenCategories = new Map<string, string>();

  const ensureCategory = (label: string): string => {
    const normalizedLabel = titleCaseLabel(label);
    const existing = seenCategories.get(normalizedLabel.toLowerCase());
    if (existing) return existing;
    const base = slugifyCategory(normalizedLabel) || `skill-category-${categories.length + 1}`;
    let id = base;
    let suffix = 2;
    while (categories.some((category) => category.id === id)) {
      id = `${base}-${suffix++}`;
    }
    categories.push({ id, label: normalizedLabel });
    seenCategories.set(normalizedLabel.toLowerCase(), id);
    return id;
  };

  const ensureDefaultCategory = (categoryId: string): string => {
    const fallback =
      DEFAULT_SKILL_CATEGORIES.find((category) => category.id === categoryId) ??
      DEFAULT_SKILL_CATEGORIES[DEFAULT_SKILL_CATEGORIES.length - 1];
    if (!categories.some((category) => category.id === fallback.id)) {
      categories.push({ id: fallback.id, label: fallback.label });
    }
    return fallback.id;
  };

  const addSkill = (raw: string, categoryId: string) => {
    const label = cleanField(raw)
      .replace(/^[-–—*]\s*/, "")
      .replace(/\.$/, "")
      .trim();
    if (label.length < 1 || label.length > 60) return;
    if (SKILL_JUNK_RE.test(label)) return;
    if (/^\d+$/.test(label)) return;
    const key = label.toLowerCase();
    if (seenSkills.has(key)) return;
    seenSkills.add(key);
    skills.push({ id: createId(), label, category: categoryId });
  };

  const addItems = (rawItems: string, categoryId: string) => {
    const items = splitListItems(rawItems)
      .flatMap((item) => item.split(/\s{2,}/))
      .map((item) => item.trim())
      .filter(Boolean);

    for (const item of items) {
      addSkill(item, categoryId);
    }
  };

  let pendingCategoryId: string | null = null;

  for (const rawLine of lines) {
    const line = stripBullet(rawLine);
    if (!line) continue;

    const groups = line.split(/\s*[|•;]\s*/).filter(Boolean);
    for (const group of groups) {
      const proficiencyPairs = splitListItems(group)
        .map((part) => {
          const index = part.indexOf(":");
          if (index <= 0) return null;
          return {
            label: cleanField(part.slice(0, index)),
            level: cleanField(part.slice(index + 1)),
          };
        })
        .filter(
          (pair): pair is { label: string; level: string } =>
            !!pair && !!pair.label && !!pair.level
        );

      if (
        proficiencyPairs.length > 1 &&
        proficiencyPairs.every(
          (pair) =>
            !CATEGORY_WORD_RE.test(pair.label) && PROFICIENCY_RE.test(pair.level)
        )
      ) {
        for (const pair of proficiencyPairs) {
          const categoryId =
            pendingCategoryId ?? ensureDefaultCategory(categoriseSkill(pair.label));
          addSkill(pair.label, categoryId);
        }
        pendingCategoryId = null;
        continue;
      }

      const colon = group.indexOf(":");
      if (colon > 0) {
        const categoryLabel = cleanField(group.slice(0, colon));
        const items = group.slice(colon + 1).trim();
        if (
          items &&
          !CATEGORY_WORD_RE.test(categoryLabel) &&
          looksLikeProficiencyList(items)
        ) {
          const categoryId =
            pendingCategoryId ?? ensureDefaultCategory(categoriseSkill(categoryLabel));
          addSkill(categoryLabel, categoryId);
          pendingCategoryId = null;
          continue;
        }
        if (
          categoryLabel.length <= 45 &&
          /^[A-Za-z][A-Za-z0-9 &/+.#()'\-]*$/.test(categoryLabel)
        ) {
          const categoryId = ensureCategory(categoryLabel);
          if (items) {
            addItems(items, categoryId);
            pendingCategoryId = null;
          } else {
            pendingCategoryId = categoryId;
          }
          continue;
        }
      }

      const items = splitListItems(group);
      for (const item of items) {
        if (!item) continue;
        const categoryId =
          pendingCategoryId ?? ensureDefaultCategory(categoriseSkill(item));
        addSkill(item, categoryId);
      }
    }
  }

  return { skills, categories };
}

function parseDeclaration(lines: string[], knownName = ""): Partial<Resume> | null {
  if (lines.length === 0) return null;
  const textLines: string[] = [];
  let place = "";
  let date = "";

  for (const line of lines) {
    const placeMatch = line.match(/^(?:place|location)\s*[:\-]\s*(.+)$/i);
    const dateMatch = line.match(/^date\s*[:\-]\s*(.+)$/i);
    if (placeMatch) place = cleanField(placeMatch[1]);
    else if (dateMatch) date = cleanField(dateMatch[1]);
    else if (/^signature\b/i.test(line)) continue;
    else if (line) textLines.push(line);
  }

  let signatureName = "";
  const normalizedName = cleanWhitespace(knownName).toLowerCase();
  if (normalizedName && textLines.length > 1) {
    const last = cleanField(textLines[textLines.length - 1]);
    if (last.toLowerCase() === normalizedName) {
      signatureName = knownName;
      textLines.pop();
    }
  }

  const text = cleanWhitespace(textLines.join(" "));
  if (!text && !place && !date) return null;

  return {
    declaration: {
      enabled: true,
      text,
      place,
      date,
      showPlace: !!place,
      showDate: !!date,
      showSignature: !!signatureName,
      showSignatureName: !!signatureName,
      signatureName,
    },
  };
}

function extractSummaryText(lines: string[]): string {
  return cleanWhitespace(
    lines
      .map((line) => stripBullet(line).replace(/^(?:summary|profile|objective)\s*[:\-]\s*/i, ""))
      .filter(Boolean)
      .join(" ")
  ).slice(0, MAX_SUMMARY_LENGTH);
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
    achievementCount: number;
    languageCount: number;
  };
  sectionOrder: ReorderableSectionId[];
  twoColumn?: boolean;
}

export function parseResumeText(rawText: string): ParsedResumeResult {
  const text = normalizeExtractedText(rawText);
  const sections = splitIntoSections(text);
  const personal = extractPersonal(sections.header, text);

  const data: Partial<Resume> = { personal };

  const summaryText = extractSummaryText(linesForTarget(sections.captures, "summary"));
  if (summaryText) {
    data.summary = { text: summaryText };
    data.summaryEnabled = true;
  }

  const education: EducationEntry[] = [];
  for (const capture of sections.captures) {
    if (capture.target !== "education") continue;
    for (const chunk of segmentEntries(capture.lines, "education")) {
      const entry = parseEducationEntry(chunk);
      if (entry) education.push(entry);
    }
  }
  if (education.length) {
    data.education = education;
    data.educationEnabled = true;
  }

  const experience: ExperienceEntry[] = [];
  for (const capture of sections.captures) {
    if (capture.target !== "experience") continue;
    for (const chunk of segmentEntries(capture.lines, "experience")) {
      const entry = parseExperienceEntry(chunk, capture.type);
      if (entry) experience.push(entry);
    }
  }
  if (experience.length) data.experience = experience;

  const projects: ProjectEntry[] = [];
  for (const capture of sections.captures) {
    if (capture.target !== "projects") continue;
    for (const chunk of segmentEntries(capture.lines, "projects")) {
      const entry = parseProjectEntry(chunk);
      if (entry) projects.push(entry);
    }
  }
  if (projects.length) data.projects = projects;

  const skillLines = linesForTarget(sections.captures, "skills");
  if (skillLines.length) {
    const parsedSkills = parseSkills(skillLines);
    if (parsedSkills.skills.length) {
      data.skills = parsedSkills.skills;
      data.skillCategories = parsedSkills.categories;
    }
  }

  const certifications: CertificationEntry[] = [];
  for (const capture of sections.captures) {
    if (capture.target !== "certifications") continue;
    for (const chunk of segmentEntries(capture.lines, "certifications")) {
      const entry = parseCertificationEntry(chunk);
      if (entry) certifications.push(entry);
    }
  }
  if (certifications.length) {
    data.certifications = certifications;
    data.certificationsEnabled = true;
  }

  const achievementItems = extractAchievementItems(
    linesForTarget(sections.captures, "achievements")
  );
  if (achievementItems.length) {
    const achievements: AchievementEntry[] = achievementItems.map((achievement) => ({
      id: createId(),
      text: achievement,
    }));
    data.achievements = achievements;
    data.achievementsEnabled = true;
  }

  const languageLines = linesForTarget(sections.captures, "languages");
  if (languageLines.length) {
    const languages = extractLanguageItems(languageLines);
    if (languages.length) {
      data.languages = languages;
      data.languagesEnabled = true;
    }
  }

  const declaration = parseDeclaration(
    linesForTarget(sections.captures, "declaration"),
    personal.fullName
  );
  if (declaration) data.declaration = declaration.declaration;

  const sectionOrder = sections.order.filter((id) => {
    if (id === "summary") return !!data.summary?.text;
    if (id === "education") return (data.education?.length ?? 0) > 0;
    if (id === "experience") return (data.experience?.length ?? 0) > 0;
    if (id === "projects") return (data.projects?.length ?? 0) > 0;
    if (id === "skills") return (data.skills?.length ?? 0) > 0;
    if (id === "certifications") return (data.certifications?.length ?? 0) > 0;
    if (id === "achievements") return (data.achievements?.length ?? 0) > 0;
    if (id === "languages") return (data.languages?.length ?? 0) > 0;
    if (id === "declaration") return !!data.declaration?.text;
    return false;
  });

  return {
    data,
    summary: {
      detectedName: !!personal.fullName,
      detectedEmail: !!personal.email,
      educationCount: education.length,
      experienceCount: experience.length,
      projectCount: projects.length,
      skillCount: data.skills?.length ?? 0,
      certificationCount: certifications.length,
      achievementCount: data.achievements?.length ?? 0,
      languageCount: data.languages?.length ?? 0,
    },
    sectionOrder,
  };
}
