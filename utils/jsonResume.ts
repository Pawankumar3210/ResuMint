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
  Declaration,
  CustomSection,
  ReorderableSectionId,
} from "@/types/resume";
import { ExperienceType } from "@/types/resume";
import { createId } from "@/lib/id";
import { downloadBlob } from "@/lib/download-file";
import { DEFAULT_SECTION_ORDER, DEFAULT_SKILL_CATEGORIES } from "@/constants/resume-defaults";
import type { ParsedResumeResult } from "./resumeParser";
import { cleanWhitespace, normalizeProfileUrl } from "./resumeValidation";

/**
 * Standard JSON Resume Schema (v1.0.0) exporter.
 * Conforms to https://jsonresume.org/schema/
 */
export function exportToJsonResume(resume: Resume): Record<string, unknown> {
  const {
    personal,
    summary,
    summaryEnabled,
    education,
    educationEnabled,
    experience,
    projects,
    skills,
    certifications,
    certificationsEnabled,
    achievements,
    achievementsEnabled,
    languages,
    languagesEnabled,
  } = resume;

  const profiles = [];
  if (personal.linkedin) {
    const clean = normalizeProfileUrl(personal.linkedin);
    profiles.push({
      network: "LinkedIn",
      username: clean.replace(/^linkedin\.com\/in\//i, "").replace(/\/+$/, ""),
      url: `https://${clean}`,
    });
  }
  if (personal.github) {
    const clean = normalizeProfileUrl(personal.github);
    profiles.push({
      network: "GitHub",
      username: clean.replace(/^github\.com\//i, "").replace(/\/+$/, ""),
      url: `https://${clean}`,
    });
  }

  // Group skills by category for JSON Resume's skills array format
  const skillsByCategory: Record<string, string[]> = {};
  for (const skill of skills) {
    if (!skillsByCategory[skill.category]) skillsByCategory[skill.category] = [];
    skillsByCategory[skill.category].push(skill.label);
  }

  return {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics: {
      name: personal.fullName || undefined,
      email: personal.email || undefined,
      phone: personal.phone || undefined,
      url: personal.portfolio
        ? personal.portfolio.startsWith("http")
          ? personal.portfolio
          : `https://${personal.portfolio}`
        : undefined,
      summary: summaryEnabled && summary.text.trim() ? summary.text.trim() : undefined,
      location: personal.location ? { city: personal.location, address: personal.location } : undefined,
      profiles: profiles.length > 0 ? profiles : undefined,
    },
    work: experience.map((exp) => ({
      name: exp.organization,
      position: exp.role,
      summary: exp.description,
      startDate: exp.startYear
        ? exp.startMonth
          ? `${exp.startYear}-${exp.startMonth}`
          : exp.startYear
        : undefined,
      endDate: exp.current
        ? undefined
        : exp.endYear
          ? exp.endMonth
            ? `${exp.endYear}-${exp.endMonth}`
            : exp.endYear
          : undefined,
    })),
    education: educationEnabled
      ? education.map((edu) => ({
          institution: edu.institution,
          studyType: edu.degree,
          area: edu.branch,
          score: edu.grade,
          startDate: edu.startYear
            ? edu.startMonth
              ? `${edu.startYear}-${edu.startMonth}`
              : edu.startYear
            : undefined,
          endDate: edu.endYear
            ? edu.endMonth
              ? `${edu.endYear}-${edu.endMonth}`
              : edu.endYear
            : undefined,
        }))
      : [],
    skills: (resume.skillCategories ?? []).filter((cat) => (skillsByCategory[cat.id] ?? []).length > 0).map((cat) => ({
      name: cat.label,
      keywords: skillsByCategory[cat.id],
    })),
    projects: projects.map((p) => ({
      name: p.name,
      description: p.description,
      keywords: p.techStack ? p.techStack.split(",").map((t) => t.trim()).filter(Boolean) : [],
      url: p.liveUrl || p.githubUrl || undefined,
    })),
    certificates: certificationsEnabled
      ? certifications.map((c) => ({
          name: c.name,
          issuer: c.organization,
          date: c.year ? (c.month ? `${c.year}-${c.month}` : c.year) : undefined,
        }))
      : [],
    languages: languagesEnabled
      ? languages.map((lang) => ({
          language: lang.label,
          fluency: "Native / Competent",
        }))
      : [],
    awards: achievementsEnabled
      ? achievements.map((a) => ({
          title: a.text,
        }))
      : [],
  };
}

/**
 * Downloads the current resume as a formatted JSON Resume file.
 */
export function downloadJsonResume(resume: Resume, filename?: string): void {
  const data = exportToJsonResume(resume);
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
  const safeName = (filename || "Resume").replace(/\.json$/i, "").trim() || "Resume";
  downloadBlob(blob, `${safeName}.json`);
}


const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const VALID_SECTION_IDS = new Set<string>(DEFAULT_SECTION_ORDER);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return cleanWhitespace(value);
  if (typeof value === "number") return String(value);
  return "";
}

function asMultilineString(value: unknown): string {
  if (typeof value !== "string") return asString(value);
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => cleanWhitespace(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item) => item.length > 0);
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeMonthValue(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  const numeric = raw.match(/^(\d{1,2})$/);
  if (numeric) {
    const month = Number(numeric[1]);
    return month >= 1 && month <= 12 ? MONTH_NAMES[month - 1] : "";
  }
  const short = raw.slice(0, 3).toLowerCase();
  const index = MONTH_NAMES.findIndex((month) => month.toLowerCase() === short);
  return index >= 0 ? MONTH_NAMES[index] : "";
}

interface ParsedDateValue {
  month: string;
  year: string;
  current: boolean;
}

function parseDateValue(value: unknown): ParsedDateValue {
  const raw = asString(value);
  if (!raw) return { month: "", year: "", current: false };
  if (/\b(?:present|current|now|ongoing|till\s+date)\b/i.test(raw)) {
    return { month: "", year: "", current: true };
  }

  const yearMatch = raw.match(/\b((?:19|20)\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : "";

  const isoMatch = raw.match(/^\d{4}-(\d{1,2})(?:-\d{1,2})?$/);
  const namedMatch = raw.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i
  );

  let month = "";
  if (namedMatch) month = normalizeMonthValue(namedMatch[1]);
  else if (isoMatch) month = normalizeMonthValue(isoMatch[1]);

  return { month, year, current: false };
}

function normalizeSkillCategoryId(value: string): string {
  const raw = cleanWhitespace(value).toLowerCase();
  if (!raw) return "";
  if (/language|programming/.test(raw)) return "languages";
  if (/framework|librar|front.?end|back.?end|web/.test(raw)) return "frameworks";
  if (/tool|platform|devops|cloud|database|infra/.test(raw)) return "tools";
  if (/concept|other|soft.?skill/.test(raw)) return "other";
  return raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function categoryLabelForId(id: string): string {
  const known = DEFAULT_SKILL_CATEGORIES.find((category) => category.id === id);
  if (known) return known.label;
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function sanitizeSkillCategories(value: unknown, skills: SkillItem[]): SkillCategoryConfig[] {
  const categories: SkillCategoryConfig[] = [];
  const byId = new Map<string, string>();

  const add = (rawId: string, rawLabel: string) => {
    const id = cleanWhitespace(rawId) || normalizeSkillCategoryId(rawLabel);
    if (!id || byId.has(id)) return;
    const label = cleanWhitespace(rawLabel) || categoryLabelForId(id);
    byId.set(id, label);
    categories.push({ id, label });
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      const record = asRecord(item);
      if (record) {
        add(asString(record.id), asString(record.label));
      } else {
        const label = asString(item);
        add(normalizeSkillCategoryId(label), label);
      }
    }
  }

  for (const skill of skills) {
    if (!byId.has(skill.category)) add(skill.category, categoryLabelForId(skill.category));
  }

  return categories;
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

function resolveExperienceType(value: unknown, role: string, organization: string, description: string): ExperienceType {
  const raw = asString(value).toLowerCase();
  if (/intern/.test(raw)) return ExperienceType.Internship;
  if (/volunt/.test(raw)) return ExperienceType.Volunteer;
  if (/freelance|contract/.test(raw)) return ExperienceType.Freelance;
  if (/part/.test(raw)) return ExperienceType.PartTime;
  if (/club/.test(raw)) return ExperienceType.Club;
  if (/leadership|lead/.test(raw)) return ExperienceType.Leadership;
  if (/full/.test(raw)) return ExperienceType.FullTime;
  return inferExperienceType(role, organization, description);
}

function formatJsonDescription(summary: unknown, highlights: unknown): string {
  const parts: string[] = [];
  const summaryText = asMultilineString(summary);
  if (summaryText) parts.push(summaryText);
  for (const highlight of asStringArray(highlights)) {
    const text = highlight.startsWith("•") ? highlight : `• ${highlight}`;
    parts.push(text);
  }
  return parts.join("\n");
}

function normalizeSectionOrder(value: unknown): ReorderableSectionId[] {
  const order: ReorderableSectionId[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(value)) return order;
  for (const item of value) {
    if (typeof item !== "string" || !VALID_SECTION_IDS.has(item) || seen.has(item)) continue;
    seen.add(item);
    order.push(item as ReorderableSectionId);
  }
  return order;
}

function deriveSectionOrder(data: Partial<Resume>): ReorderableSectionId[] {
  const order: ReorderableSectionId[] = [];
  if (data.summary?.text) order.push("summary");
  if (data.education?.length) order.push("education");
  if (data.experience?.length) order.push("experience");
  if (data.projects?.length) order.push("projects");
  if (data.skills?.length) order.push("skills");
  if (data.certifications?.length) order.push("certifications");
  if (data.achievements?.length) order.push("achievements");
  if (data.languages?.length) order.push("languages");
  if (data.declaration?.text) order.push("declaration");
  return order;
}

function normalizeDirectDeclaration(value: unknown): Declaration | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const place = asString(record.place);
  const date = asString(record.date);
  const text = asMultilineString(record.text);
  if (!text && !place && !date) return undefined;
  return {
    enabled: asBool(record.enabled, true),
    text,
    place,
    date,
    showPlace: asBool(record.showPlace, !!place),
    showDate: asBool(record.showDate, !!date),
    showSignature: asBool(record.showSignature, false),
    showSignatureName: asBool(record.showSignatureName, false),
    signatureName: asString(record.signatureName),
  };
}

function normalizeCustomSection(value: unknown): CustomSection | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    enabled: asBool(record.enabled, false),
    title: asString(record.title),
    body: asMultilineString(record.body),
    column: record.column === "left" ? "left" : "right",
  };
}

function readEntryDate(record: Record<string, unknown>, prefix: "start" | "end"): ParsedDateValue {
  const directMonth = record[`${prefix}Month`];
  const directYear = record[`${prefix}Year`];
  if (directMonth !== undefined || directYear !== undefined) {
    return {
      month: normalizeMonthValue(directMonth),
      year: asString(directYear),
      current: false,
    };
  }
  return parseDateValue(record[`${prefix}Date`]);
}

function hasDirectDate(record: Record<string, unknown>, prefix: "start" | "end"): boolean {
  return (
    record[`${prefix}Month`] !== undefined ||
    record[`${prefix}Year`] !== undefined ||
    record[`${prefix}Date`] !== undefined
  );
}

function normalizeJsonEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const start = readEntryDate(record, "start");
      const end = readEntryDate(record, "end");
      const institution = asString(record.institution);
      const degree = asString(record.degree || record.studyType);
      const branch = asString(record.branch || record.area);
      const grade = asString(record.grade || record.score);
      if (!institution && !degree && !branch && !grade) return null;
      return {
        id: createId(),
        institution,
        degree,
        branch,
        grade,
        startMonth: start.month,
        startYear: start.year,
        endMonth: end.current ? "" : end.month,
        endYear: end.current ? "" : end.year,
      };
    })
    .filter((entry): entry is EducationEntry => entry !== null);
}

function normalizeJsonWork(
  value: unknown,
  forcedType?: ExperienceType
): ExperienceEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const role = asString(record.role || record.position);
      const organization = asString(record.organization || record.name || record.company);
      const description = formatJsonDescription(record.summary || record.description, record.highlights);
      const start = readEntryDate(record, "start");
      const end = readEntryDate(record, "end");
      if (!role && !organization && !description) return null;
      const hasEnd = hasDirectDate(record, "end");
      return {
        id: createId(),
        type:
          forcedType ??
          resolveExperienceType(record.type || record.employmentType, role, organization, description),
        organization,
        role,
        description,
        startMonth: start.month,
        startYear: start.year,
        endMonth: end.current ? "" : end.month,
        endYear: end.current ? "" : end.year,
        current: asBool(record.current, end.current || !hasEnd),
      };
    })
    .filter((entry): entry is ExperienceEntry => entry !== null);
}

function normalizeJsonProjects(value: unknown): ProjectEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const url = asString(record.url);
      const description = formatJsonDescription(record.description, record.highlights);
      const techStack = asString(record.techStack) || asStringArray(record.keywords).join(", ");
      const name = asString(record.name);
      const directGithub = normalizeProfileUrl(asString(record.githubUrl));
      const directLive = normalizeProfileUrl(asString(record.liveUrl));
      if (!name && !description) return null;
      return {
        id: createId(),
        name,
        description,
        techStack,
        githubUrl: directGithub || (url.includes("github.com") ? normalizeProfileUrl(url) : ""),
        liveUrl: directLive || (url && !url.includes("github.com") ? normalizeProfileUrl(url) : ""),
      };
    })
    .filter((entry): entry is ProjectEntry => entry !== null);
}

function normalizeJsonCertifications(value: unknown): CertificationEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const name = asString(record.name);
      const organization = asString(record.issuer || record.organization);
      const parsedDate = parseDateValue(record.date || record.releaseDate);
      const directMonth = normalizeMonthValue(record.month);
      const directYear = asString(record.year);
      if (!name) return null;
      return {
        id: createId(),
        name,
        organization,
        month: directMonth || parsedDate.month,
        year: directYear || parsedDate.year,
      };
    })
    .filter((entry): entry is CertificationEntry => entry !== null);
}

function normalizeJsonAchievements(value: unknown, kind: "award" | "publication" | "interest"): AchievementEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = cleanWhitespace(item);
        return text ? { id: createId(), text } : null;
      }
      const record = asRecord(item);
      if (!record) return null;

      let text = "";
      if (kind === "award") {
        text = [asString(record.title), asString(record.awarder), asString(record.summary), asString(record.date)]
          .filter(Boolean)
          .join(" - ");
      } else if (kind === "publication") {
        text = [asString(record.name), asString(record.publisher), asString(record.releaseDate), asString(record.website)]
          .filter(Boolean)
          .join(" - ");
      } else {
        const keywords = asStringArray(record.keywords).join(", ");
        text = [asString(record.name), keywords].filter(Boolean).join(": ");
      }

      return text ? { id: createId(), text } : null;
    })
    .filter((entry): entry is AchievementEntry => entry !== null);
}

function normalizeJsonLanguages(value: unknown): LanguageItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const languages: LanguageItem[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const label = cleanWhitespace(item);
      if (!label || seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      languages.push({ id: createId(), label });
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const language = asString(record.label || record.language);
    if (!language) continue;
    const fluency = asString(record.fluency);
    const label = fluency ? `${language} (${fluency})` : language;
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    languages.push({ id: createId(), label });
  }
  return languages;
}

function normalizeDirectResume(parsed: Record<string, unknown>): {
  data: Partial<Resume>;
  sectionOrder: ReorderableSectionId[];
} {
  const personalRecord = asRecord(parsed.personal) ?? {};
  const personal: Resume["personal"] = {
    fullName: asString(personalRecord.fullName),
    email: asString(personalRecord.email).toLowerCase(),
    phone: asString(personalRecord.phone),
    location: asString(personalRecord.location),
    linkedin: normalizeProfileUrl(asString(personalRecord.linkedin)),
    github: normalizeProfileUrl(asString(personalRecord.github)),
    portfolio: normalizeProfileUrl(asString(personalRecord.portfolio)),
  };

  const summaryRecord = asRecord(parsed.summary);
  const summaryText = summaryRecord ? asMultilineString(summaryRecord.text) : asString(parsed.summary);
  const summary: Resume["summary"] = { text: summaryText };

  const education = Array.isArray(parsed.education)
    ? normalizeJsonEducation(parsed.education)
    : [];
  const experience = Array.isArray(parsed.experience)
    ? normalizeJsonWork(parsed.experience)
    : [];
  const projects = Array.isArray(parsed.projects)
    ? normalizeJsonProjects(parsed.projects)
    : [];
  const certifications = Array.isArray(parsed.certifications)
    ? normalizeJsonCertifications(parsed.certifications)
    : [];

  const achievements: AchievementEntry[] = [];
  if (Array.isArray(parsed.achievements)) {
    for (const item of parsed.achievements) {
      if (typeof item === "string") {
        const text = cleanWhitespace(item);
        if (text) achievements.push({ id: createId(), text });
      } else {
        const record = asRecord(item);
        const text = record ? asMultilineString(record.text) : "";
        if (text) achievements.push({ id: createId(), text });
      }
    }
  }

  const languages: LanguageItem[] = [];
  if (Array.isArray(parsed.languages)) {
    for (const item of parsed.languages) {
      if (typeof item === "string") {
        const label = cleanWhitespace(item);
        if (label) languages.push({ id: createId(), label });
      } else {
        const record = asRecord(item);
        const label = record ? asString(record.label) : "";
        if (label) languages.push({ id: createId(), label });
      }
    }
  }

  const skills: SkillItem[] = [];
  if (Array.isArray(parsed.skills)) {
    for (const item of parsed.skills) {
      if (typeof item === "string") {
        const label = cleanWhitespace(item);
        if (label) skills.push({ id: createId(), label, category: "other" });
        continue;
      }
      const record = asRecord(item);
      if (!record) continue;
      const label = asString(record.label || record.name);
      if (!label) continue;
      const category = asString(record.category) || normalizeSkillCategoryId(label) || "other";
      skills.push({ id: createId(), label, category });
    }
  }
  const skillCategories = sanitizeSkillCategories(parsed.skillCategories, skills);

  const declaration = normalizeDirectDeclaration(parsed.declaration);
  const custom = normalizeCustomSection(parsed.custom);
  const custom2 = normalizeCustomSection(parsed.custom2);
  const custom3 = normalizeCustomSection(parsed.custom3);

  const data: Partial<Resume> = {
    personal,
    summary,
    summaryEnabled: asBool(parsed.summaryEnabled, !!summary.text),
    education,
    educationEnabled: asBool(parsed.educationEnabled, education.length > 0),
    experience,
    projects,
    skills,
    skillCategories,
    certifications,
    certificationsEnabled: asBool(parsed.certificationsEnabled, certifications.length > 0),
    achievements,
    achievementsEnabled: asBool(parsed.achievementsEnabled, achievements.length > 0),
    languages,
    languagesEnabled: asBool(parsed.languagesEnabled, languages.length > 0),
  };

  if (declaration) data.declaration = declaration;
  if (custom) data.custom = custom;
  if (custom2) data.custom2 = custom2;
  if (custom3) data.custom3 = custom3;

  if (parsed.template === "modern" || parsed.template === "classic") {
    data.template = parsed.template;
  }
  if (typeof parsed.onePageFit === "boolean") data.onePageFit = parsed.onePageFit;

  const explicitOrder = normalizeSectionOrder(parsed.sectionOrder);
  return {
    data,
    sectionOrder: explicitOrder.length ? explicitOrder : deriveSectionOrder(data),
  };
}

/**
 * Parses a standard JSON Resume document into ResuMint's ParsedResumeResult structure
 * for interactive section selection in ImportResumeDialog.
 */
export function parseJsonResume(jsonString: string): ParsedResumeResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON file. Please provide a valid JSON Resume document.");
  }

  const parsed = asRecord(raw);
  if (!parsed) {
    throw new Error("Invalid JSON file. Please provide a valid JSON Resume document.");
  }

  if (asRecord(parsed.personal)) {
    const { data, sectionOrder } = normalizeDirectResume(parsed);
    return {
      data,
      summary: {
        detectedName: !!data.personal?.fullName,
        detectedEmail: !!data.personal?.email,
        educationCount: data.education?.length ?? 0,
        experienceCount: data.experience?.length ?? 0,
        projectCount: data.projects?.length ?? 0,
        skillCount: data.skills?.length ?? 0,
        certificationCount: data.certifications?.length ?? 0,
        achievementCount: data.achievements?.length ?? 0,
        languageCount: data.languages?.length ?? 0,
      },
      sectionOrder,
    };
  }

  const basics = asRecord(parsed.basics) ?? {};

  let linkedin = "";
  let github = "";
  let portfolio = "";

  if (Array.isArray(basics.profiles)) {
    for (const item of basics.profiles) {
      const profile = asRecord(item);
      if (!profile) continue;
      const network = asString(profile.network).toLowerCase();
      const url = normalizeProfileUrl(asString(profile.url));
      if (!url) continue;
      if (network.includes("linkedin") || /linkedin\.com/i.test(url)) {
        if (!linkedin) linkedin = url;
      } else if (network.includes("github") || /github\.com/i.test(url)) {
        if (!github) github = url;
      } else if (!portfolio) {
        portfolio = url;
      }
    }
  }

  const locationRecord = asRecord(basics.location);
  const location =
    typeof basics.location === "string"
      ? asString(basics.location)
      : locationRecord
        ? [asString(locationRecord.city), asString(locationRecord.region), asString(locationRecord.countryCode)]
            .filter(Boolean)
            .join(", ")
        : "";

  const portfolioFromBasics = normalizeProfileUrl(asString(basics.url));

  const personal: Resume["personal"] = {
    fullName: asString(basics.name),
    email: asString(basics.email).toLowerCase(),
    phone: asString(basics.phone),
    location,
    linkedin,
    github,
    portfolio: portfolioFromBasics || portfolio,
  };

  const summary: Resume["summary"] = {
    text: asMultilineString(basics.summary),
  };

  const education = normalizeJsonEducation(parsed.education);
  const experience = [
    ...normalizeJsonWork(parsed.work),
    ...normalizeJsonWork(parsed.volunteer, ExperienceType.Volunteer),
  ];
  const projects = normalizeJsonProjects(parsed.projects);

  const skills: SkillItem[] = [];
  const categoryConfigs: SkillCategoryConfig[] = [];
  const seenSkills = new Set<string>();
  const seenCategories = new Set<string>();

  const addCategory = (id: string, label: string) => {
    if (!id || seenCategories.has(id)) return;
    seenCategories.add(id);
    categoryConfigs.push({ id, label: label || categoryLabelForId(id) });
  };

  if (Array.isArray(parsed.skills)) {
    for (const item of parsed.skills) {
      if (typeof item === "string") {
        const label = cleanWhitespace(item);
        if (!label) continue;
        const key = label.toLowerCase();
        if (seenSkills.has(key)) continue;
        seenSkills.add(key);
        addCategory("other", categoryLabelForId("other"));
        skills.push({ id: createId(), label, category: "other" });
        continue;
      }

      const record = asRecord(item);
      if (!record) continue;

      const name = asString(record.name);
      const keywords = asStringArray(record.keywords);
      if (keywords.length === 0) continue;

      const categoryId = normalizeSkillCategoryId(name) || "other";
      addCategory(categoryId, name || categoryLabelForId(categoryId));

      for (const keyword of keywords) {
        const key = keyword.toLowerCase();
        if (seenSkills.has(key)) continue;
        seenSkills.add(key);
        skills.push({ id: createId(), label: keyword, category: categoryId });
      }
    }
  }

  const certifications = normalizeJsonCertifications(
    Array.isArray(parsed.certificates) ? parsed.certificates : parsed.certifications
  );
  const achievements = [
    ...normalizeJsonAchievements(parsed.awards, "award"),
    ...normalizeJsonAchievements(parsed.publications, "publication"),
    ...normalizeJsonAchievements(parsed.interests, "interest"),
  ];
  const languages = normalizeJsonLanguages(parsed.languages);
  const skillCategories = sanitizeSkillCategories(categoryConfigs, skills);

  const data: Partial<Resume> = {
    personal,
    summary,
    summaryEnabled: !!summary.text,
    education,
    educationEnabled: education.length > 0,
    experience,
    projects,
    skills,
    skillCategories,
    certifications,
    certificationsEnabled: certifications.length > 0,
    achievements,
    achievementsEnabled: achievements.length > 0,
    languages,
    languagesEnabled: languages.length > 0,
  };

  return {
    data,
    summary: {
      detectedName: !!personal.fullName,
      detectedEmail: !!personal.email,
      educationCount: education.length,
      experienceCount: experience.length,
      projectCount: projects.length,
      skillCount: skills.length,
      certificationCount: certifications.length,
      achievementCount: achievements.length,
      languageCount: languages.length,
    },
    sectionOrder: deriveSectionOrder(data),
  };
}
