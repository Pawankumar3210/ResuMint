/** ---------------------------------------------------------------------
 * ResuMint data model.
 * Kept intentionally flat (per technical spec: "avoid deeply nested
 * objects") so it serializes cleanly to localStorage and maps directly
 * onto PDF/DOCX renderers later.
 * ------------------------------------------------------------------- */

export interface PersonalDetails {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string; // optional
}

export interface ProfessionalSummary {
  text: string; // max 300 characters, enforced in the UI layer
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  branch: string;
  grade: string; // CGPA or percentage, free text by design (both formats exist)
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
}

export enum ExperienceType {
  Internship = "Internship",
  FullTime = "Full-Time",
  PartTime = "Part-Time",
  Volunteer = "Volunteer",
  Freelance = "Freelance",
  Club = "Club Experience",
  Leadership = "Leadership",
}

export interface ExperienceEntry {
  id: string;
  type: ExperienceType;
  organization: string;
  role: string;
  description: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  current: boolean; // "present" toggle, disables end date
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  techStack: string; // optional -- free text, e.g. "React, Node.js, PostgreSQL"
  githubUrl: string; // optional
  liveUrl: string; // optional
}

export const SKILL_CATEGORIES = ["languages", "frameworks", "tools", "other"] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export interface SkillItem {
  id: string;
  label: string;
  category: SkillCategory;
}

export interface CertificationEntry {
  id: string;
  name: string;
  organization: string;
  month: string;
  year: string;
}

export interface AchievementEntry {
  id: string;
  text: string;
}

export interface LanguageItem {
  id: string;
  label: string;
}

export interface Declaration {
  enabled: boolean;
  text: string;
  place: string;
  date: string;
  showPlace: boolean;
  showDate: boolean;
  showSignature: boolean;
  showSignatureName: boolean;
  signatureName: string;
}

/** A user-defined, free-text section (title + body), toggleable on/off
 *  the same way Declaration/Achievements are. Two independent slots are
 *  supported (see Resume.custom / Resume.custom2 below) rather than a
 *  dynamic list -- covers "I want one or two more sections the builder
 *  doesn't have a dedicated form for" without introducing
 *  dynamically-keyed sections into a codebase where every other section
 *  is a fixed, statically-typed SectionId. */
export interface CustomSection {
  enabled: boolean;
  title: string;
  body: string;
}

export interface Resume {
  personal: PersonalDetails;
  summary: ProfessionalSummary;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillItem[];
  certifications: CertificationEntry[];
  /** Lets the whole Certifications section be hidden even if entries
   *  exist, the same way Declaration.enabled/achievementsEnabled work --
   *  defaults to true so existing resumes with certifications already
   *  saved keep showing them unchanged; this only adds the option to
   *  turn it off. */
  certificationsEnabled: boolean;
  achievements: AchievementEntry[];
  /** Lets the whole Achievements section be hidden even if entries exist,
   *  the same way Declaration.enabled works -- defaults to true so
   *  existing resumes with achievements already saved keep showing them
   *  unchanged; this only adds the option to turn it off. */
  achievementsEnabled: boolean;
  languages: LanguageItem[];
  /** Same pattern as certificationsEnabled/achievementsEnabled. */
  languagesEnabled: boolean;
  declaration: Declaration;
  custom: CustomSection;
  custom2: CustomSection;
  /** The order sections other than "personal" render in, across the
   *  builder sidebar, live preview, PDF export, and DOCX export --
   *  reorderable by the person via up/down controls. "personal" is
   *  deliberately excluded: it's the resume's header (name/contact),
   *  not a repositionable section, so it's always rendered first and
   *  never appears in this list. Defaults to DEFAULT_SECTION_ORDER
   *  (see constants/resume-defaults.ts), which is SECTION_IDS minus
   *  "personal", so existing resumes keep their current visual order
   *  unchanged until the person deliberately reorders something. */
  sectionOrder: ReorderableSectionId[];
}

export const SECTION_IDS = [
  "personal",
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "achievements",
  "languages",
  "declaration",
  "custom",
  "custom2",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** Every section id except "personal" -- see Resume.sectionOrder above
 *  for why "personal" is excluded from the reorderable set. */
export type ReorderableSectionId = Exclude<SectionId, "personal">;

export type SectionStatus = "empty" | "partial" | "complete";
