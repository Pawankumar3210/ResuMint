import { ACTION_VERBS } from "@/constants/action-verbs";
import type { AtsReadinessCheck, AtsReadinessStatus } from "@/types/ats";
import type { Resume } from "@/types/resume";
import { isValidEmail, isValidPhone } from "@/utils/resumeValidation";

const STATUS_VALUE: Record<AtsReadinessStatus, number> = {
  pass: 1,
  warning: 0.5,
  fail: 0,
};

function firstWord(text: string): string {
  return text
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z]/g, "") ?? "";
}

function hasMetric(text: string): boolean {
  return /\d/.test(text);
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function buildAtsReadiness(resume: Resume): AtsReadinessCheck[] {
  const checks: AtsReadinessCheck[] = [];
  const { personal } = resume;

  const hasEmail = personal.email.trim().length > 0;
  const hasPhone = personal.phone.trim().length > 0;
  const contactComplete =
    hasEmail && hasPhone && isValidEmail(personal.email) && isValidPhone(personal.phone);
  checks.push({
    id: "contact",
    label: "Contact details",
    status: contactComplete ? "pass" : hasEmail || hasPhone ? "warning" : "fail",
    detail: contactComplete
      ? "Email and phone are present and readable."
      : hasEmail || hasPhone
        ? "One contact method is missing or malformed."
        : "No email or phone number was found.",
    suggestion: contactComplete
      ? undefined
      : "Add a professional email and phone number so recruiters can reach you.",
    weight: 14,
  });

  const summaryLength = resume.summary.text.trim().length;
  const summaryEnabled = resume.summaryEnabled;
  checks.push({
    id: "summary",
    label: "Professional summary",
    status:
      summaryEnabled && summaryLength >= 80
        ? "pass"
        : summaryEnabled && summaryLength > 0
          ? "warning"
          : "fail",
    detail:
      summaryEnabled && summaryLength >= 80
        ? "A substantial summary gives the resume a clear opening."
        : summaryEnabled && summaryLength > 0
          ? "The summary is present but very short."
          : "No professional summary is visible.",
    suggestion:
      summaryEnabled && summaryLength >= 80
        ? undefined
        : "Write 2–3 sentences that state your target role, strongest skills, and the value you bring.",
    weight: 10,
  });

  const experienceEntries = resume.experience.filter(
    (entry) => entry.role.trim() || entry.organization.trim() || entry.description.trim()
  );
  const projectEntries = resume.projects.filter(
    (project) => project.name.trim() || project.description.trim()
  );
  checks.push({
    id: "core-sections",
    label: "Experience or projects",
    status:
      experienceEntries.length > 0 && projectEntries.length > 0
        ? "pass"
        : experienceEntries.length > 0 || projectEntries.length > 0
          ? "pass"
          : "fail",
    detail:
      experienceEntries.length > 0 && projectEntries.length > 0
        ? "Both experience and projects provide evidence."
        : experienceEntries.length > 0
          ? "Experience entries are present."
          : projectEntries.length > 0
            ? "Projects provide the main evidence of your work."
            : "No experience or project content was found.",
    suggestion:
      experienceEntries.length > 0 || projectEntries.length > 0
        ? undefined
        : "Add at least one experience entry or project with a concrete description.",
    weight: 14,
  });

  const impactSources = [
    ...resume.experience.map((entry) => entry.description),
    ...resume.projects.map((project) => project.description),
  ].filter((text) => text.trim().length > 0);
  const metricSources = impactSources.filter(hasMetric);
  const metricRatio = impactSources.length
    ? metricSources.length / impactSources.length
    : 0;
  checks.push({
    id: "impact",
    label: "Quantified impact",
    status:
      impactSources.length > 0 && metricRatio >= 0.5
        ? "pass"
        : impactSources.length > 0
          ? "warning"
          : "fail",
    detail:
      impactSources.length === 0
        ? "There are no experience or project descriptions to measure."
        : metricSources.length > 0
          ? `${metricSources.length} of ${impactSources.length} descriptions include a number.`
          : "Descriptions do not include measurable results.",
    suggestion:
      impactSources.length > 0 && metricRatio >= 0.5
        ? undefined
        : "Add truthful numbers such as time saved, users reached, performance gained, or scale handled.",
    weight: 12,
  });

  const skillCount = resume.skills.filter((skill) => skill.label.trim()).length;
  checks.push({
    id: "skills",
    label: "Skills section",
    status: skillCount >= 5 ? "pass" : skillCount > 0 ? "warning" : "fail",
    detail:
      skillCount >= 5
        ? `${skillCount} skills are listed.`
        : skillCount > 0
          ? `Only ${skillCount} skill${skillCount === 1 ? " is" : "s are"} listed.`
          : "No skills are listed.",
    suggestion:
      skillCount >= 5
        ? undefined
        : "List the tools, languages, and concepts you can genuinely discuss.",
    weight: 10,
  });

  const datedExperience = resume.experience.filter(
    (entry) => entry.startYear.trim() || entry.role.trim() || entry.organization.trim()
  );
  const incompleteDates = datedExperience.filter(
    (entry) => !entry.startYear.trim() || (!entry.current && !entry.endYear.trim())
  );
  checks.push({
    id: "dates",
    label: "Dates",
    status:
      datedExperience.length === 0
        ? "warning"
        : incompleteDates.length === 0
          ? "pass"
          : incompleteDates.length < datedExperience.length
            ? "warning"
            : "fail",
    detail:
      datedExperience.length === 0
        ? "No experience entries are available to check for dates."
        : incompleteDates.length === 0
          ? "Experience dates are complete."
          : `${incompleteDates.length} experience entr${incompleteDates.length === 1 ? "y is" : "ies are"} missing a start or end date.`,
    suggestion:
      datedExperience.length === 0
        ? "Add at least one dated experience entry so parsers can place your timeline."
        : incompleteDates.length === 0
          ? undefined
          : "Add a start date and either an end date or a Present marker to every experience entry.",
    weight: 8,
  });

  const descriptions = resume.experience
    .map((entry) => entry.description.trim())
    .filter(Boolean);
  const verbCount = descriptions.filter((description) =>
    ACTION_VERBS.includes(firstWord(description))
  ).length;
  const verbRatio = descriptions.length ? verbCount / descriptions.length : 1;
  checks.push({
    id: "action-verbs",
    label: "Action verbs",
    status:
      descriptions.length === 0
        ? "warning"
        : verbRatio >= 0.5
          ? "pass"
          : verbCount > 0
            ? "warning"
            : "fail",
    detail:
      descriptions.length === 0
        ? "No experience descriptions are available to check for action verbs."
        : `${verbCount} of ${descriptions.length} descriptions begin with a strong action verb.`,
    suggestion:
      descriptions.length === 0
        ? "Add a concrete experience description and start it with a direct verb."
        : verbRatio >= 0.5
          ? undefined
          : "Start each description with a direct verb such as Built, Improved, Automated, or Led.",
    weight: 8,
  });

  checks.push({
    id: "layout",
    label: "ATS-safe layout",
    status: resume.template === "classic" ? "pass" : "warning",
    detail:
      resume.template === "classic"
        ? "The single-column Classic layout is the easiest structure for text parsers."
        : "The Modern two-column layout can be harder for older ATS parsers to read.",
    suggestion:
      resume.template === "classic"
        ? undefined
        : "If a portal rejects or garbles the file, export the Classic layout instead.",
    weight: 8,
  });

  const allText = [
    personal.fullName,
    personal.email,
    personal.phone,
    personal.location,
    resume.summary.text,
    ...resume.experience.flatMap((entry) => [entry.role, entry.organization, entry.description]),
    ...resume.projects.flatMap((project) => [project.name, project.description, project.techStack]),
    ...resume.skills.map((skill) => skill.label),
  ].join(" ");
  const placeholder =
    /\b(lorem ipsum|john doe|jane doe|your name|your email|example\.com|123 main street)\b/i.test(
      allText
    );
  checks.push({
    id: "placeholders",
    label: "Placeholder check",
    status: placeholder ? "warning" : "pass",
    detail: placeholder
      ? "Placeholder or example text is still visible."
      : "No common placeholder text was found.",
    suggestion: placeholder
      ? "Replace sample names, emails, and addresses with your real information."
      : undefined,
    weight: 8,
  });

  const contentWordCount =
    wordCount(resume.summary.text) +
    resume.experience.reduce((sum, entry) => sum + wordCount(entry.description), 0) +
    resume.projects.reduce((sum, project) => sum + wordCount(project.description), 0) +
    resume.achievements.reduce((sum, item) => sum + wordCount(item.text), 0);

  checks.push({
    id: "length",
    label: "Resume length",
    status:
      contentWordCount >= 120 && contentWordCount <= 750
        ? "pass"
        : contentWordCount > 0
          ? "warning"
          : "fail",
    detail:
      contentWordCount >= 120 && contentWordCount <= 750
        ? `${contentWordCount} words across your main content — a comfortable length.`
        : contentWordCount > 750
          ? `${contentWordCount} words is long for a focused one- or two-page resume.`
          : contentWordCount > 0
            ? `${contentWordCount} words may be too thin to show enough evidence.`
            : "No descriptive content was found.",
    suggestion:
      contentWordCount >= 120 && contentWordCount <= 750
        ? undefined
        : contentWordCount > 750
          ? "Trim repeated or low-value detail so the strongest evidence stays easy to scan."
          : "Add specific detail about what you built, changed, or improved.",
    weight: 8,
  });

  return checks;
}

export function scoreReadiness(checks: AtsReadinessCheck[]): number {
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  if (total === 0) return 0;
  const earned = checks.reduce(
    (sum, check) => sum + check.weight * STATUS_VALUE[check.status],
    0
  );
  return Math.round((earned / total) * 100);
}
