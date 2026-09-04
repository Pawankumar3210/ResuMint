import type { Resume, ReorderableSectionId } from "@/types/resume";
import { SKILL_CATEGORIES } from "@/types/resume";
import { SKILL_CATEGORY_META } from "@/constants/resume-defaults";
import { formatDateRange, joinNonEmpty } from "@/utils/helpers";

/**
 * Plain, unformatted text version of the resume -- for pasting directly
 * into application-portal text boxes that don't accept a file upload.
 * Mirrors docxExport.ts's section order and content exactly (same data,
 * same order via resume.sectionOrder, same conditionals for what counts
 * as "empty"); the only difference is there's no styling to carry, since
 * plain text can't represent bold/borders/tables anyway.
 */
export function buildResumePlainText(resume: Resume): string {
  const {
    personal,
    summary,
    education,
    experience,
    projects,
    skills,
    certifications,
    achievements,
    achievementsEnabled,
    languages,
    declaration,
    custom,
    sectionOrder,
  } = resume;

  const lines: string[] = [];
  const blank = () => lines.push("");
  const heading = (title: string) => {
    blank();
    const upper = title.toUpperCase();
    lines.push(upper);
    lines.push("-".repeat(upper.length));
  };

  lines.push((personal.fullName || "Your Name").toUpperCase());
  const contactLine = joinNonEmpty(
    [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio],
    " | "
  );
  if (contactLine) lines.push(contactLine);

  const sectionBuilders: Record<ReorderableSectionId, () => void> = {
    summary: () => {
      if (!summary.text.trim()) return;
      heading("Summary");
      lines.push(summary.text.trim());
    },

    education: () => {
      if (education.length === 0) return;
      heading("Education");
      education.forEach((e, i) => {
        if (i > 0) blank();
        const title = `${e.institution || "Institution"}${e.degree ? ` — ${e.degree}${e.branch ? `, ${e.branch}` : ""}` : ""}`;
        const date = formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear);
        lines.push(date ? `${title} (${date})` : title);
        if (e.grade) lines.push(e.grade);
      });
    },

    experience: () => {
      if (experience.length === 0) return;
      heading("Experience");
      experience.forEach((e, i) => {
        if (i > 0) blank();
        const title = `${e.role || "Role"}${e.organization ? ` — ${e.organization}` : ""}`;
        const date = formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear, e.current);
        lines.push(date ? `${title} (${date})` : title);
        if (e.type) lines.push(e.type);
        if (e.description) lines.push(e.description);
      });
    },

    projects: () => {
      if (projects.length === 0) return;
      heading("Projects");
      projects.forEach((p, i) => {
        if (i > 0) blank();
        const links = joinNonEmpty([p.githubUrl, p.liveUrl]);
        lines.push(links ? `${p.name || "Project"} (${links})` : p.name || "Project");
        if (p.description) lines.push(p.description);
      });
    },

    skills: () => {
      if (skills.length === 0) return;
      heading("Skills");
      SKILL_CATEGORIES.forEach((category) => {
        const items = skills.filter((s) => s.category === category);
        if (items.length === 0) return;
        lines.push(`${SKILL_CATEGORY_META[category].label}: ${items.map((s) => s.label).join(", ")}`);
      });
    },

    certifications: () => {
      if (certifications.length === 0) return;
      heading("Certifications");
      certifications.forEach((c) => {
        const title = `${c.name || "Certification"}${c.organization ? ` — ${c.organization}` : ""}`;
        const date = joinNonEmpty([c.month, c.year]);
        lines.push(date ? `${title} (${date})` : title);
      });
    },

    achievements: () => {
      if (!achievementsEnabled || achievements.length === 0) return;
      heading("Achievements");
      achievements.forEach((a) => lines.push(`- ${a.text}`));
    },

    languages: () => {
      if (languages.length === 0) return;
      heading("Languages");
      lines.push(languages.map((l) => l.label).join(", "));
    },

    declaration: () => {
      if (!declaration.enabled || !declaration.text.trim()) return;
      heading("Declaration");
      lines.push(declaration.text.trim());

      if (declaration.showPlace || declaration.showDate) {
        blank();
        if (declaration.showPlace) lines.push(`Place: ${declaration.place || "_______________"}`);
        if (declaration.showDate) lines.push(`Date: ${declaration.date || "_______________"}`);
      }
      if (declaration.showSignature) {
        blank();
        if (declaration.showSignatureName && declaration.signatureName.trim()) {
          lines.push(declaration.signatureName.trim());
        }
        lines.push("Signature: _______________");
      }
    },

    custom: () => {
      if (!custom.enabled || !(custom.title.trim() || custom.body.trim())) return;
      heading(custom.title || "Custom Section");
      if (custom.body.trim()) lines.push(custom.body.trim());
    },
  };

  sectionOrder.forEach((id) => sectionBuilders[id]());

  return lines.join("\n").trim() + "\n";
}
