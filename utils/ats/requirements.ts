import { MONTH_OPTIONS } from "@/constants/resume-defaults";
import type {
  AtsDegreeLevel,
  AtsJobRequirements,
  AtsRequirementCheck,
  AtsRequirementStatus,
} from "@/types/ats";
import type { Resume } from "@/types/resume";

const MONTH_INDEX = new Map(
  MONTH_OPTIONS.map((month, index) => [month.toLowerCase(), index])
);

const DEGREE_RANK: Record<AtsDegreeLevel, number> = {
  associate: 1,
  bachelor: 2,
  master: 3,
  doctorate: 4,
};

const DEGREE_LABELS: Record<AtsDegreeLevel, string> = {
  associate: "an associate degree",
  bachelor: "a bachelor's degree",
  master: "a master's degree",
  doctorate: "a doctorate",
};

const DEGREE_REQUEST_LABELS: Record<AtsDegreeLevel, string> = {
  associate: "Associate degree requested",
  bachelor: "Bachelor's degree requested",
  master: "Master's degree requested",
  doctorate: "Doctorate requested",
};

const DEGREE_PATTERNS: { level: AtsDegreeLevel; pattern: RegExp }[] = [
  {
    level: "doctorate",
    pattern: /\b(?:ph\.?\s?d\.?|doctorate|doctoral degree)\b/i,
  },
  {
    level: "master",
    pattern:
      /\b(?:master['’]?s?(?:\s+degree)?|m\.?\s?tech|mba|postgraduate degree)\b/i,
  },
  {
    level: "master",
    pattern: /\bM\.?\s?E\.?\b/,
  },
  {
    level: "master",
    pattern: /\bM\.?\s?S\.?\b/,
  },
  {
    level: "master",
    pattern: /\bM\.?\s?Sc\b/i,
  },
  {
    level: "bachelor",
    pattern:
      /\b(?:bachelor['’]?s?(?:\s+degree)?|b\.?\s?tech|undergraduate degree)\b/i,
  },
  {
    level: "bachelor",
    pattern: /\bB\.?\s?E\.?\b/,
  },
  {
    level: "bachelor",
    pattern: /\bB\.?\s?S\.?\b/,
  },
  {
    level: "bachelor",
    pattern: /\bB\.?\s?Sc\b/i,
  },
  {
    level: "associate",
    pattern: /\b(?:associate['’]?s?\s+degree|associate degree)\b/i,
  },
];

function parseMonth(value: string): number | null {
  const clean = value.trim().toLowerCase();
  if (!clean) return null;

  const direct = MONTH_INDEX.get(clean);
  if (direct !== undefined) return direct;

  for (const [label, index] of MONTH_INDEX) {
    if (clean.startsWith(label) || label.startsWith(clean.slice(0, 3))) {
      return index;
    }
  }

  return null;
}

function monthValue(year: string, month: string): number | null {
  const parsedYear = Number.parseInt(year, 10);
  const parsedMonth = parseMonth(month);
  if (!Number.isFinite(parsedYear) || parsedMonth === null) return null;
  return parsedYear * 12 + parsedMonth;
}

function currentMonthValue(): number {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
}

export function estimateExperienceMonths(resume: Resume): {
  months: number;
  incomplete: number;
} {
  const intervals: { start: number; end: number }[] = [];
  let incomplete = 0;

  for (const entry of resume.experience) {
    const hasAnyDate =
      entry.startYear.trim() ||
      entry.startMonth.trim() ||
      entry.endYear.trim() ||
      entry.endMonth.trim() ||
      entry.current;

    if (!hasAnyDate) continue;

    const start = monthValue(entry.startYear, entry.startMonth);
    const end = entry.current
      ? currentMonthValue()
      : monthValue(entry.endYear, entry.endMonth);

    if (start === null || end === null || end < start) {
      incomplete += 1;
      continue;
    }

    intervals.push({ start, end });
  }

  intervals.sort((a, b) => a.start - b.start);

  let months = 0;
  let currentStart: number | null = null;
  let currentEnd: number | null = null;

  for (const interval of intervals) {
    if (currentStart === null || currentEnd === null) {
      currentStart = interval.start;
      currentEnd = interval.end;
      continue;
    }

    if (interval.start <= currentEnd + 1) {
      currentEnd = Math.max(currentEnd, interval.end);
      continue;
    }

    months += currentEnd - currentStart + 1;
    currentStart = interval.start;
    currentEnd = interval.end;
  }

  if (currentStart !== null && currentEnd !== null) {
    months += currentEnd - currentStart + 1;
  }

  return { months, incomplete };
}

function inferResumeDegree(resume: Resume): AtsDegreeLevel | undefined {
  if (!resume.educationEnabled) return undefined;

  const text = resume.education
    .map((entry) => `${entry.degree} ${entry.branch}`)
    .join(" ");

  for (const degree of DEGREE_PATTERNS) {
    if (degree.pattern.test(text)) return degree.level;
  }

  return undefined;
}

function formatMonths(months: number): string {
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.round((months / 12) * 10) / 10;
  return `${years} year${years === 1 ? "" : "s"}`;
}

function statusForExperience(
  requiredYears: number,
  months: number
): AtsRequirementStatus {
  if (months >= requiredYears * 12) return "pass";
  return "warning";
}

export function buildAtsRequirements(
  requirements: AtsJobRequirements,
  resume: Resume
): AtsRequirementCheck[] {
  const checks: AtsRequirementCheck[] = [];

  if (requirements.minExperienceYears) {
    const requiredYears = requirements.minExperienceYears;
    const { months, incomplete } = estimateExperienceMonths(resume);
    let status: AtsRequirementStatus;
    let detail: string;

    if (months === 0) {
      status = "info";
      detail =
        incomplete > 0
          ? "The job asks for dated experience, but your experience dates are incomplete. Add start and end dates to compare."
          : "The job asks for dated experience. Add dated experience to compare.";
    } else {
      status = statusForExperience(requiredYears, months);
      detail =
        status === "pass"
          ? `Your dated experience totals about ${formatMonths(months)}, meeting the ${requiredYears}+ years requested.`
          : `The job asks for ${requiredYears}+ years. Your dated experience totals about ${formatMonths(months)}. Projects and internships can still help — only add what is accurate.`;
    }

    checks.push({
      id: "experience-years",
      label: `${requiredYears}+ years requested`,
      status,
      detail,
    });
  }

  if (requirements.degreeLevel) {
    const requested = requirements.degreeLevel;
    const resumeDegree = inferResumeDegree(resume);
    let status: AtsRequirementStatus;
    let detail: string;

    if (!resumeDegree) {
      status = "info";
      detail = `The job asks for ${DEGREE_LABELS[requested]}. No matching degree was detected in Education. Add one only if you have it.`;
    } else if (DEGREE_RANK[resumeDegree] >= DEGREE_RANK[requested]) {
      status = "pass";
      detail = `Your education shows ${DEGREE_LABELS[resumeDegree]}, meeting the requested level.`;
    } else {
      status = "warning";
      detail = `The job asks for ${DEGREE_LABELS[requested]}. Your education shows ${DEGREE_LABELS[resumeDegree]} — experience and certifications may still qualify you.`;
    }

    checks.push({
      id: "education-degree",
      label: DEGREE_REQUEST_LABELS[requested],
      status,
      detail,
    });
  }

  if (requirements.certifications.length > 0) {
    checks.push({
      id: "certifications",
      label: "Certifications mentioned",
      status: "info",
      detail: `${requirements.certifications.join(", ")}. Add a certification only if you actually hold it.`,
    });
  }

  return checks;
}
