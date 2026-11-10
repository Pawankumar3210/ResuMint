import type { Resume, EducationEntry, ExperienceEntry, ProjectEntry, SkillItem, CertificationEntry, AchievementEntry, LanguageItem } from "@/types/resume";
import { ExperienceType, SKILL_CATEGORIES } from "@/types/resume";
import { createId } from "@/lib/id";
import { downloadBlob } from "@/lib/download-file";
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

/**
 * Parses a standard JSON Resume document into ResuMint's ParsedResumeResult structure
 * for interactive section selection in ImportResumeDialog.
 */
export function parseJsonResume(jsonString: string): ParsedResumeResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON file. Please provide a valid JSON Resume document.");
  }

  // Handle either standard JSON Resume (with basics, work, etc.)
  // OR a raw exported ResuMint object (with personal, experience, etc.)
  if (parsed.personal && typeof parsed.personal === "object") {
    // Direct ResuMint JSON format -- pass through mergeResumeWithDefaults-style
    const r = parsed as Partial<Resume>;
    const data: Partial<Resume> = {
      personal: (r.personal as Resume["personal"]) || undefined,
      summary: (r.summary as Resume["summary"]) || undefined,
      summaryEnabled: typeof r.summaryEnabled === "boolean" ? r.summaryEnabled : true,
      education: Array.isArray(r.education) ? (r.education as EducationEntry[]) : [],
      educationEnabled: typeof r.educationEnabled === "boolean" ? r.educationEnabled : true,
      experience: Array.isArray(r.experience) ? (r.experience as ExperienceEntry[]) : [],
      projects: Array.isArray(r.projects) ? (r.projects as ProjectEntry[]) : [],
      skills: Array.isArray(r.skills) ? (r.skills as SkillItem[]) : [],
      certifications: Array.isArray(r.certifications) ? (r.certifications as CertificationEntry[]) : [],
      certificationsEnabled: typeof r.certificationsEnabled === "boolean" ? r.certificationsEnabled : true,
      achievements: Array.isArray(r.achievements) ? (r.achievements as AchievementEntry[]) : [],
      achievementsEnabled: typeof r.achievementsEnabled === "boolean" ? r.achievementsEnabled : true,
      languages: Array.isArray(r.languages) ? (r.languages as LanguageItem[]) : [],
      languagesEnabled: typeof r.languagesEnabled === "boolean" ? r.languagesEnabled : true,
      template: r.template === "modern" ? "modern" : "classic",
    };
    const skillCount = (data.skills ?? []).length;
    return {
      data,
      summary: {
        detectedName: !!(data.personal as Resume["personal"] | undefined)?.fullName,
        detectedEmail: !!(data.personal as Resume["personal"] | undefined)?.email,
        educationCount: (data.education ?? []).length,
        experienceCount: (data.experience ?? []).length,
        projectCount: (data.projects ?? []).length,
        skillCount,
        certificationCount: (data.certifications ?? []).length,
      },
    };
  }

  const basics = (parsed.basics as Record<string, unknown>) || {};

  // Personal details
  let linkedin = "";
  let github = "";
  if (Array.isArray(basics.profiles)) {
    for (const p of basics.profiles as Record<string, string>[]) {
      const net = (p.network || "").toLowerCase();
      const url = p.url || "";
      if (net.includes("linkedin") || url.includes("linkedin.com")) {
        linkedin = normalizeProfileUrl(url);
      } else if (net.includes("github") || url.includes("github.com")) {
        github = normalizeProfileUrl(url);
      }
    }
  }

  const locationRaw = basics.location as Record<string, string> | string | undefined;
  const personal: Resume["personal"] = {
    fullName: cleanWhitespace((basics.name as string) || ""),
    email: cleanWhitespace((basics.email as string) || ""),
    phone: cleanWhitespace((basics.phone as string) || ""),
    location: cleanWhitespace(
      typeof locationRaw === "string"
        ? locationRaw
        : [locationRaw?.city, locationRaw?.region, locationRaw?.countryCode].filter(Boolean).join(", ")
    ),
    linkedin,
    github,
    portfolio: basics.url ? normalizeProfileUrl(basics.url as string) : "",
  };

  // Summary
  const summary: Resume["summary"] = {
    text: basics.summary ? cleanWhitespace(basics.summary as string) : "",
  };

  // Education
  const education: EducationEntry[] = [];
  if (Array.isArray(parsed.education)) {
    for (const edu of parsed.education as Record<string, string>[]) {
      const startParts = (edu.startDate || "").split("-");
      const endParts = (edu.endDate || "").split("-");
      education.push({
        id: createId(),
        institution: cleanWhitespace(edu.institution || ""),
        degree: cleanWhitespace(edu.studyType || ""),
        branch: cleanWhitespace(edu.area || ""),
        grade: cleanWhitespace(edu.score || ""),
        startMonth: startParts[1] || "",
        startYear: startParts[0] || "",
        endMonth: endParts[1] || "",
        endYear: endParts[0] || "",
      });
    }
  }

  // Work / Experience
  const experience: ExperienceEntry[] = [];
  if (Array.isArray(parsed.work)) {
    for (const w of parsed.work as Record<string, unknown>[]) {
      const startParts = ((w.startDate as string) || "").split("-");
      const endParts = ((w.endDate as string) || "").split("-");
      const highlights = Array.isArray(w.highlights) ? (w.highlights as string[]).join("\n") : "";
      experience.push({
        id: createId(),
        organization: cleanWhitespace((w.name as string) || ""),
        role: cleanWhitespace((w.position as string) || ""),
        type: ExperienceType.Internship,
        description: cleanWhitespace((w.summary as string) || highlights),
        startMonth: startParts[1] || "",
        startYear: startParts[0] || "",
        endMonth: endParts[1] || "",
        endYear: endParts[0] || "",
        current: !w.endDate,
      });
    }
  }

  // Projects
  const projects: ProjectEntry[] = [];
  if (Array.isArray(parsed.projects)) {
    for (const p of parsed.projects as Record<string, unknown>[]) {
      const tech = Array.isArray(p.keywords) ? (p.keywords as string[]).join(", ") : "";
      const url = (p.url as string) || "";
      const highlights = Array.isArray(p.highlights) ? (p.highlights as string[]).join("\n") : "";
      projects.push({
        id: createId(),
        name: cleanWhitespace((p.name as string) || ""),
        description: cleanWhitespace((p.description as string) || highlights),
        techStack: tech,
        githubUrl: url.includes("github.com") ? normalizeProfileUrl(url) : "",
        liveUrl: !url.includes("github.com") && url ? normalizeProfileUrl(url) : "",
      });
    }
  }

  // Skills -- map JSON Resume skill categories to ResuMint's flat SkillItem[]
  const skills: SkillItem[] = [];
  if (Array.isArray(parsed.skills)) {
    for (const s of parsed.skills as Record<string, unknown>[]) {
      const catName = ((s.name as string) || "").toLowerCase();
      let matchedCategory: typeof SKILL_CATEGORIES[number] = SKILL_CATEGORIES[0];
      if (catName.includes("framework") || catName.includes("web") || catName.includes("frontend") || catName.includes("librar")) {
        matchedCategory = "frameworks";
      } else if (catName.includes("tool") || catName.includes("devops") || catName.includes("cloud") || catName.includes("platform")) {
        matchedCategory = "tools";
      } else if (catName.includes("concept") || catName.includes("other")) {
        matchedCategory = "other";
      }

      const keywords = Array.isArray(s.keywords) ? (s.keywords as string[]) : [];
      for (const kw of keywords) {
        const label = cleanWhitespace(kw);
        if (label) skills.push({ id: createId(), label, category: matchedCategory });
      }
    }
  }

  // Certifications
  const certifications: CertificationEntry[] = [];
  const certSource = Array.isArray(parsed.certificates)
    ? (parsed.certificates as Record<string, string>[])
    : Array.isArray(parsed.certifications)
      ? (parsed.certifications as Record<string, string>[])
      : [];
  for (const c of certSource) {
    const dateParts = (c.date || "").split("-");
    certifications.push({
      id: createId(),
      name: cleanWhitespace(c.name || ""),
      organization: cleanWhitespace(c.issuer || ""),
      month: dateParts[1] || "",
      year: dateParts[0] || "",
    });
  }

  // Languages
  const languages: LanguageItem[] = [];
  if (Array.isArray(parsed.languages)) {
    for (const l of parsed.languages as (string | Record<string, string>)[]) {
      const name = typeof l === "string" ? l : l.language;
      if (name) languages.push({ id: createId(), label: cleanWhitespace(name) });
    }
  }

  // Achievements / Awards
  const achievements: AchievementEntry[] = [];
  if (Array.isArray(parsed.awards)) {
    for (const a of parsed.awards as Record<string, string>[]) {
      const text = [a.title, a.awarder, a.summary].filter(Boolean).join(" - ");
      if (text) {
        achievements.push({
          id: createId(),
          text: cleanWhitespace(text),
        });
      }
    }
  }

  return {
    data: {
      personal,
      summary,
      summaryEnabled: !!summary.text,
      education,
      educationEnabled: education.length > 0,
      experience,
      projects,
      skills,
      certifications,
      certificationsEnabled: certifications.length > 0,
      achievements,
      achievementsEnabled: achievements.length > 0,
      languages,
      languagesEnabled: languages.length > 0,
    },
    summary: {
      detectedName: !!personal.fullName,
      detectedEmail: !!personal.email,
      educationCount: education.length,
      experienceCount: experience.length,
      projectCount: projects.length,
      skillCount: skills.length,
      certificationCount: certifications.length,
    },
  };
}
