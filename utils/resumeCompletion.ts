import type { Resume, SectionId, SectionStatus } from "@/types/resume";
import { SECTION_IDS } from "@/types/resume";
import { SECTION_WEIGHTS } from "@/constants/resume-defaults";
import { isNonEmpty } from "./resumeValidation";

const STATUS_VALUE: Record<SectionStatus, number> = {
  empty: 0,
  partial: 0.5,
  complete: 1,
};

/**
 * Resume Completion is a simple "did you fill this in" signal for the
 * builder sidebar -- purely "did you fill this in," not a content-quality
 * analysis.
 */
export function getSectionStatus(resume: Resume, section: SectionId): SectionStatus {
  switch (section) {
    case "personal": {
      const { fullName, email, phone, location, linkedin, github, portfolio } =
        resume.personal;
      const required = [fullName, email, phone, location];
      const filledRequired = required.filter(isNonEmpty).length;
      const optionalFilled = [linkedin, github, portfolio].some(isNonEmpty);
      if (filledRequired === required.length) return "complete";
      if (filledRequired > 0 || optionalFilled) return "partial";
      return "empty";
    }

    case "summary": {
      const len = resume.summary.text.trim().length;
      if (len === 0) return "empty";
      if (len < 50) return "partial";
      return "complete";
    }

    case "education": {
      if (resume.education.length === 0) return "empty";
      const complete = resume.education.every(
        (e) =>
          isNonEmpty(e.institution) &&
          isNonEmpty(e.degree) &&
          isNonEmpty(e.startYear) &&
          isNonEmpty(e.endYear)
      );
      return complete ? "complete" : "partial";
    }

    case "experience": {
      if (resume.experience.length === 0) return "empty";
      const complete = resume.experience.every(
        (e) =>
          isNonEmpty(e.organization) &&
          isNonEmpty(e.role) &&
          isNonEmpty(e.description) &&
          isNonEmpty(e.startYear)
      );
      return complete ? "complete" : "partial";
    }

    case "projects": {
      if (resume.projects.length === 0) return "empty";
      const complete = resume.projects.every(
        (p) => isNonEmpty(p.name) && isNonEmpty(p.description)
      );
      return complete ? "complete" : "partial";
    }

    case "skills": {
      if (resume.skills.length === 0) return "empty";
      return resume.skills.length >= 3 ? "complete" : "partial";
    }

    case "certifications": {
      if (resume.certifications.length === 0) return "empty";
      const complete = resume.certifications.every(
        (c) => isNonEmpty(c.name) && isNonEmpty(c.organization)
      );
      return complete ? "complete" : "partial";
    }

    case "achievements":
      if (!resume.achievementsEnabled) return "empty";
      return resume.achievements.length === 0 ? "empty" : "complete";

    case "languages":
      return resume.languages.length === 0 ? "empty" : "complete";

    case "declaration":
      if (!resume.declaration.enabled) return "empty";
      return isNonEmpty(resume.declaration.text) ? "complete" : "partial";

    case "custom":
      if (!resume.custom.enabled) return "empty";
      return isNonEmpty(resume.custom.title) && isNonEmpty(resume.custom.body) ? "complete" : "partial";

    default:
      return "empty";
  }
}

export function getAllSectionStatuses(resume: Resume): Record<SectionId, SectionStatus> {
  return Object.fromEntries(
    SECTION_IDS.map((id) => [id, getSectionStatus(resume, id)])
  ) as Record<SectionId, SectionStatus>;
}

/** Weighted 0-100 completion score across all sections. */
export function getOverallCompletion(resume: Resume): number {
  const total = SECTION_IDS.reduce((sum, id) => {
    const status = getSectionStatus(resume, id);
    return sum + SECTION_WEIGHTS[id] * STATUS_VALUE[status];
  }, 0);
  return Math.round(total);
}
