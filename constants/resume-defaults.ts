import type { Resume, ReorderableSectionId, SectionId, SkillCategory } from "@/types/resume";
import { ExperienceType, SECTION_IDS } from "@/types/resume";
import type { ResumeStore, SavedResume } from "@/types/resume-store";
import { createId } from "@/lib/id";

/** SECTION_IDS minus "personal" -- see Resume.sectionOrder in
 *  types/resume.ts. Since "custom" is the last entry in SECTION_IDS,
 *  it naturally lands last here too, satisfying "custom sections
 *  appear last by default" without any extra bookkeeping. */
export const DEFAULT_SECTION_ORDER: ReorderableSectionId[] = SECTION_IDS.filter(
  (id): id is ReorderableSectionId => id !== "personal"
);

export const EMPTY_RESUME: Resume = {
  personal: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
  },
  summary: { text: "" },
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
  achievements: [],
  achievementsEnabled: true,
  languages: [],
  declaration: {
    enabled: false,
    text: "",
    place: "",
    date: "",
    showPlace: false,
    showDate: false,
    showSignature: false,
    showSignatureName: false,
    signatureName: "",
  },
  custom: { enabled: false, title: "", body: "" },
  sectionOrder: DEFAULT_SECTION_ORDER,
};

export const SECTION_META: Record<
  SectionId,
  { label: string; optional?: boolean }
> = {
  personal: { label: "Personal Details" },
  summary: { label: "Professional Summary" },
  education: { label: "Education" },
  experience: { label: "Experience" },
  projects: { label: "Projects" },
  skills: { label: "Skills" },
  certifications: { label: "Certifications", optional: true },
  achievements: { label: "Achievements", optional: true },
  languages: { label: "Languages", optional: true },
  declaration: { label: "Declaration", optional: true },
  custom: { label: "Custom Section", optional: true },
};

/** Relative weight each section contributes to overall Resume Completion.
 *  Sums to 100. Core sections (personal, education, experience, etc.)
 *  are weighted higher than optional flourishes (declaration, custom).
 *  Adding "custom" took a point each from languages/declaration to make
 *  room while keeping the total at 100. */
export const SECTION_WEIGHTS: Record<SectionId, number> = {
  personal: 15,
  summary: 10,
  education: 15,
  experience: 15,
  projects: 10,
  skills: 10,
  certifications: 7,
  achievements: 7,
  languages: 4,
  declaration: 4,
  custom: 3,
};

export const EXPERIENCE_TYPE_OPTIONS = Object.values(ExperienceType);

export const SKILL_CATEGORY_META: Record<
  SkillCategory,
  { label: string; placeholder: string; suggestions: string[] }
> = {
  languages: {
    label: "Languages",
    placeholder: "Type a language and press Enter",
    suggestions: ["JavaScript", "TypeScript", "Python", "Java", "C++", "SQL", "Go"],
  },
  frameworks: {
    label: "Frameworks / Libraries",
    placeholder: "Type a framework and press Enter",
    suggestions: ["React", "Next.js", "Node.js", "Express", "Tailwind", "Django", "Spring"],
  },
  tools: {
    label: "Tools / Platforms",
    placeholder: "Type a tool and press Enter",
    suggestions: ["Git", "Docker", "Redis", "Postgres", "AWS", "Kubernetes", "Linux"],
  },
  other: {
    label: "Other / Concepts",
    placeholder: "Type a concept and press Enter",
    suggestions: ["DSA", "System Design", "REST APIs", "OOP", "CI/CD", "Testing"],
  },
};

export const MONTH_OPTIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const YEAR_OPTIONS = Array.from({ length: 60 }, (_, i) =>
  String(new Date().getFullYear() + 5 - i)
);

export const MAX_SUMMARY_LENGTH = 600;
export const MAX_PROJECTS = 5;
export const MAX_PROJECT_DESCRIPTION_LENGTH = 180;

/**
 * Backfills a resume loaded from localStorage with any fields missing
 * from its saved shape -- e.g. a resume saved before Declaration gained
 * `showSignatureName`/`signatureName` would otherwise load with those
 * `undefined`, crashing anywhere that assumes they're always strings/
 * booleans (like `declaration.signatureName.trim()`). Every schema
 * addition to Resume needs to stay backwards-compatible with whatever's
 * already sitting in someone's browser, since there's no server-side
 * migration step for this privacy-first, localStorage-only app.
 *
 * Deliberately shallow beyond the object fields themselves: array fields
 * (education, experience, ...) are trusted wholesale if present and an
 * array, since each entry already carries its own complete shape from
 * when it was created and partial entries aren't a realistic concern.
 */
/** Valid reorderable section ids, for filtering a loaded sectionOrder. */
const VALID_REORDERABLE_IDS = new Set<string>(DEFAULT_SECTION_ORDER);

/** Repairs a loaded sectionOrder: drops anything unrecognized or
 *  duplicated, then appends any valid section id that's missing (e.g.
 *  "custom" itself, for a resume saved before this feature existed, or
 *  any future new section) at the end, in DEFAULT_SECTION_ORDER's
 *  relative order -- so newly-introduced sections always show up
 *  exactly once, and always after whatever the person already had
 *  arranged, rather than silently vanishing or jumping to the front. */
function normalizeSectionOrder(loaded: unknown): ReorderableSectionId[] {
  const seen = new Set<string>();
  const cleaned: ReorderableSectionId[] = Array.isArray(loaded)
    ? loaded.filter((id): id is ReorderableSectionId => {
        if (typeof id !== "string" || !VALID_REORDERABLE_IDS.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
    : [];
  const missing = DEFAULT_SECTION_ORDER.filter((id) => !seen.has(id));
  return [...cleaned, ...missing];
}

export function mergeResumeWithDefaults(loaded: unknown, fallback: Resume): Resume {
  if (!loaded || typeof loaded !== "object") return fallback;
  const l = loaded as Partial<Resume>;

  const arrayOrFallback = <K extends keyof Resume>(key: K): Resume[K] =>
    Array.isArray(l[key]) ? (l[key] as Resume[K]) : fallback[key];

  return {
    personal: { ...fallback.personal, ...(l.personal ?? {}) },
    summary: { ...fallback.summary, ...(l.summary ?? {}) },
    education: arrayOrFallback("education"),
    experience: arrayOrFallback("experience"),
    projects: arrayOrFallback("projects"),
    skills: arrayOrFallback("skills"),
    certifications: arrayOrFallback("certifications"),
    achievements: arrayOrFallback("achievements"),
    achievementsEnabled:
      typeof l.achievementsEnabled === "boolean" ? l.achievementsEnabled : fallback.achievementsEnabled,
    languages: arrayOrFallback("languages"),
    declaration: { ...fallback.declaration, ...(l.declaration ?? {}) },
    custom: { ...fallback.custom, ...(l.custom ?? {}) },
    sectionOrder: normalizeSectionOrder(l.sectionOrder),
  };
}

/* ------------------------------------------------------------------ */
/* Multi-resume store                                                  */
/* ------------------------------------------------------------------ */

/** Fixed (not randomly generated) so this is a stable reference across
 *  renders -- it's used as useLocalStorage's initial React state before
 *  hydration, and a non-deterministic id here would cause a hydration
 *  mismatch between server and client. `updatedAt: 0` for the same
 *  reason (no Date.now() at module-eval time). */
export const DEFAULT_RESUME_ID = "default";
export const DEFAULT_RESUME_STORE: ResumeStore = {
  resumes: [{ id: DEFAULT_RESUME_ID, name: "My Resume", data: EMPTY_RESUME, updatedAt: 0 }],
  activeId: DEFAULT_RESUME_ID,
};

/** The localStorage key used before multi-resume support existed -- a
 *  single Resume object, not a store. Only ever read (never written) by
 *  migrateResumeStore, to carry an existing person's resume forward. */
const LEGACY_STORAGE_KEY = "resumint:resume-draft";

/** Backfills/repairs a resume store loaded from localStorage, the same
 *  way mergeResumeWithDefaults does for a single resume -- each saved
 *  resume's `data` is passed through mergeResumeWithDefaults too, so a
 *  resume saved by an older version of the app is just as safe here as
 *  it already was for the single-resume case. */
function mergeResumeStoreWithDefaults(loaded: unknown, fallback: ResumeStore): ResumeStore {
  if (
    loaded !== null &&
    typeof loaded === "object" &&
    Array.isArray((loaded as Partial<ResumeStore>).resumes) &&
    (loaded as Partial<ResumeStore>).resumes!.length > 0
  ) {
    const store = loaded as ResumeStore;
    const resumes: SavedResume[] = store.resumes
      .filter((r): r is SavedResume => !!r && typeof r === "object" && typeof r.id === "string")
      .map((r) => ({
        id: r.id,
        name: typeof r.name === "string" && r.name.trim() ? r.name : "Untitled Resume",
        data: mergeResumeWithDefaults(r.data, EMPTY_RESUME),
        updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
      }));
    if (resumes.length === 0) return fallback;
    const activeId = resumes.some((r) => r.id === store.activeId) ? store.activeId : resumes[0].id;
    return { resumes, activeId };
  }
  return fallback;
}

/**
 * The merge function passed to useLocalStorage for the resume store.
 * Two cases:
 * 1. The new multi-resume key already has valid data -- just repair/
 *    backfill it via mergeResumeStoreWithDefaults, same as any other
 *    schema migration.
 * 2. Nothing valid under the new key. Before falling back to a fresh
 *    empty store, check whether this browser has a resume saved under
 *    the OLD single-resume key (from before multi-resume support
 *    existed) and carry it forward as this person's first saved resume,
 *    rather than silently discarding it.
 */
export function migrateResumeStore(loaded: unknown, fallback: ResumeStore): ResumeStore {
  const normalized = mergeResumeStoreWithDefaults(loaded, fallback);
  if (normalized !== fallback) return normalized;

  try {
    if (typeof window !== "undefined") {
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyData = mergeResumeWithDefaults(JSON.parse(legacyRaw), EMPTY_RESUME);
        const id = createId();
        return { resumes: [{ id, name: "My Resume", data: legacyData, updatedAt: Date.now() }], activeId: id };
      }
    }
  } catch {
    // Corrupt legacy data -- fall through to the fresh default store.
  }

  return normalized;
}
