import type { Resume } from "@/types/resume";

/**
 * Escapes reserved LaTeX characters so generated documents compile
 * without syntax errors on Overleaf, pdflatex, or xelatex.
 */
function escapeLatex(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/**
 * Formats a month/year pair into a clean string (e.g. "Jun 2024").
 */
function formatDate(month?: string, year?: string): string {
  if (month && year) return `${escapeLatex(month)} ${escapeLatex(year)}`;
  if (year) return escapeLatex(year);
  return "";
}

/**
 * Generates clean, standard, Overleaf-compatible LaTeX (.tex) resume markup.
 * Designed to compile cleanly using standard pdfLaTeX with zero extra font/package dependencies.
 */
export function generateLatexResume(resume: Resume): string {
  const {
    personal,
    summary,
    summaryEnabled = true,
    education,
    educationEnabled = true,
    experience,
    projects,
    skills,
    skillCategories = [],
    certifications,
    certificationsEnabled = true,
    achievements,
    achievementsEnabled = true,
    languages,
    languagesEnabled = true,
    declaration,
    custom,
    custom2,
    custom3,
    sectionOrder,
  } = resume;

  const lines: string[] = [];

  // Preamble
  lines.push(
    "\\documentclass[letterpaper,10.5pt]{article}",
    "\\usepackage[empty]{fullpage}",
    "\\usepackage{titlesec}",
    "\\usepackage{marvosym}",
    "\\usepackage[usenames,dvipsnames]{color}",
    "\\usepackage{verbatim}",
    "\\usepackage{enumitem}",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{fancyhdr}",
    "\\usepackage[english]{babel}",
    "\\usepackage{tabularx}",
    "\\usepackage{microtype}",
    "",
    "\\pagestyle{fancy}",
    "\\fancyhf{}",
    "\\fancyfoot{}",
    "\\renewcommand{\\headrulewidth}{0pt}",
    "\\renewcommand{\\footrulewidth}{0pt}",
    "",
    "% Adjust margins",
    "\\addtolength{\\oddsidemargin}{-0.5in}",
    "\\addtolength{\\evensidemargin}{-0.5in}",
    "\\addtolength{\\textwidth}{1in}",
    "\\addtolength{\\topmargin}{-.5in}",
    "\\addtolength{\\textheight}{1.0in}",
    "",
    "\\urlstyle{same}",
    "\\raggedbottom",
    "\\raggedright",
    "\\setlength{\\tabcolsep}{0in}",
    "",
    "% Sections formatting",
    "\\titleformat{\\section}{",
    "  \\vspace{-4pt}\\scshape\\raggedright\\large",
    "}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]",
    "",
    "\\begin{document}",
    ""
  );

  // Header / Personal info
  lines.push("%----------HEADING----------");
  lines.push("\\begin{center}");
  lines.push(`    \\textbf{\\Huge \\scshape ${escapeLatex(personal.fullName || "Your Name")}} \\\\ \\vspace{4pt}`);

  const contactItems: string[] = [];
  if (personal.phone?.trim()) contactItems.push(escapeLatex(personal.phone.trim()));
  if (personal.email?.trim()) {
    contactItems.push(`\\href{mailto:${escapeLatex(personal.email.trim())}}{\\underline{${escapeLatex(personal.email.trim())}}}`);
  }
  if (personal.location?.trim()) contactItems.push(escapeLatex(personal.location.trim()));
  if (personal.linkedin?.trim()) {
    contactItems.push(`\\href{${escapeLatex(personal.linkedin.trim())}}{\\underline{LinkedIn}}`);
  }
  if (personal.github?.trim()) {
    contactItems.push(`\\href{${escapeLatex(personal.github.trim())}}{\\underline{GitHub}}`);
  }
  if (personal.portfolio?.trim()) {
    contactItems.push(`\\href{${escapeLatex(personal.portfolio.trim())}}{\\underline{Portfolio}}`);
  }

  if (contactItems.length > 0) {
    lines.push(`    \\small ${contactItems.join(" $|$ ")}`);
  }
  lines.push("\\end{center}", "");

  // Section builders
  const sectionBuilders: Record<string, () => void> = {
    summary: () => {
      if (!summaryEnabled || !summary.text.trim()) return;
      lines.push("%-----------SUMMARY-----------");
      lines.push("\\section{Summary}");
      lines.push(`\\small{${escapeLatex(summary.text.trim())}}`, "");
    },

    education: () => {
      if (!educationEnabled || education.length === 0) return;
      lines.push("%-----------EDUCATION-----------");
      lines.push("\\section{Education}");
      education.forEach((edu) => {
        const dateRange = [
          formatDate(edu.startMonth, edu.startYear),
          formatDate(edu.endMonth, edu.endYear),
        ].filter(Boolean).join(" -- ");

        lines.push("\\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}");
        lines.push(`    \\textbf{${escapeLatex(edu.institution || "Institution")}} & ${dateRange || ""} \\\\`);
        const degreeBranch = [edu.degree, edu.branch].filter(Boolean).join(" in ");
        lines.push(`    \\textit{\\small ${escapeLatex(degreeBranch)}} ${edu.grade ? `& \\small Grade: ${escapeLatex(edu.grade)}` : ""} \\\\`);
        lines.push("\\end{tabular*}\\vspace{-4pt}", "");
      });
    },

    experience: () => {
      if (experience.length === 0) return;
      lines.push("%-----------EXPERIENCE-----------");
      lines.push("\\section{Experience}");
      experience.forEach((exp) => {
        const start = formatDate(exp.startMonth, exp.startYear);
        const end = exp.current ? "Present" : formatDate(exp.endMonth, exp.endYear);
        const dateRange = [start, end].filter(Boolean).join(" -- ");

        lines.push("\\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}");
        lines.push(`    \\textbf{${escapeLatex(exp.role || "Role")}} $|$ \\textbf{${escapeLatex(exp.organization || "Organization")}} & ${dateRange} \\\\`);
        lines.push("\\end{tabular*}\\vspace{-4pt}");

        if (exp.description?.trim()) {
          lines.push("\\begin{itemize}[leftmargin=0.15in, label={$\\bullet$}]");
          const bullets = exp.description
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean);
          bullets.forEach((bullet) => {
            lines.push(`    \\item\\small{${escapeLatex(bullet)}}`);
          });
          lines.push("\\end{itemize}\\vspace{-2pt}");
        }
        lines.push("");
      });
    },

    projects: () => {
      if (projects.length === 0) return;
      lines.push("%-----------PROJECTS-----------");
      lines.push("\\section{Projects}");
      projects.forEach((proj) => {
        lines.push("\\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}");
        const tech = proj.techStack?.trim() ? ` $|$ \\emph{\\small ${escapeLatex(proj.techStack.trim())}}` : "";
        const link = proj.liveUrl || proj.githubUrl;
        const linkText = link ? ` $|$ \\href{${escapeLatex(link)}}{\\underline{Link}}` : "";
        lines.push(`    \\textbf{${escapeLatex(proj.name || "Project")}}${tech}${linkText} & \\\\`);
        lines.push("\\end{tabular*}\\vspace{-4pt}");

        if (proj.description?.trim()) {
          lines.push("\\begin{itemize}[leftmargin=0.15in, label={$\\bullet$}]");
          const bullets = proj.description
            .split("\n")
            .map((b) => b.trim())
            .filter(Boolean);
          bullets.forEach((bullet) => {
            lines.push(`    \\item\\small{${escapeLatex(bullet)}}`);
          });
          lines.push("\\end{itemize}\\vspace{-2pt}");
        }
        lines.push("");
      });
    },

    skills: () => {
      if (skills.length === 0) return;
      lines.push("%-----------PROGRAMMING SKILLS-----------");
      lines.push("\\section{Technical Skills}");
      lines.push("\\begin{itemize}[leftmargin=0.15in, label={}]");
      lines.push("    \\small{\\item{");
      const categoryRows: string[] = [];
      skillCategories.forEach((cat) => {
        const items = skills.filter((s) => s.category === cat.id);
        if (items.length === 0) return;
        categoryRows.push(`        \\textbf{${escapeLatex(cat.label)}}: ${escapeLatex(items.map((i) => i.label).join(", "))} \\\\`);
      });
      lines.push(categoryRows.join("\n"));
      lines.push("    }}");
      lines.push("\\end{itemize}\\vspace{-4pt}", "");
    },

    certifications: () => {
      if (!certificationsEnabled || certifications.length === 0) return;
      lines.push("%-----------CERTIFICATIONS-----------");
      lines.push("\\section{Certifications}");
      lines.push("\\begin{itemize}[leftmargin=0.15in, label={$\\bullet$}]");
      certifications.forEach((c) => {
        const date = [c.month, c.year].filter(Boolean).join(" ");
        const title = `${escapeLatex(c.name)}${c.organization ? ` --- \\emph{${escapeLatex(c.organization)}}` : ""}${date ? ` (${escapeLatex(date)})` : ""}`;
        lines.push(`    \\item\\small{${title}}`);
      });
      lines.push("\\end{itemize}\\vspace{-4pt}", "");
    },

    achievements: () => {
      if (!achievementsEnabled || achievements.length === 0) return;
      lines.push("%-----------ACHIEVEMENTS-----------");
      lines.push("\\section{Achievements}");
      lines.push("\\begin{itemize}[leftmargin=0.15in, label={$\\bullet$}]");
      achievements.forEach((a) => {
        lines.push(`    \\item\\small{${escapeLatex(a.text)}}`);
      });
      lines.push("\\end{itemize}\\vspace{-4pt}", "");
    },

    languages: () => {
      if (!languagesEnabled || languages.length === 0) return;
      lines.push("%-----------LANGUAGES-----------");
      lines.push("\\section{Languages}");
      lines.push(`\\small{${escapeLatex(languages.map((l) => l.label).join(", "))}}`, "");
    },

    declaration: () => {
      if (!declaration.enabled || !declaration.text.trim()) return;
      lines.push("%-----------DECLARATION-----------");
      lines.push("\\section{Declaration}");
      lines.push(`\\small{${escapeLatex(declaration.text)}}`, "");
      if (declaration.showPlace || declaration.showDate || declaration.showSignature) {
        lines.push("\\vspace{6pt}");
        lines.push("\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}");
        const leftParts = [];
        if (declaration.showPlace) leftParts.push(`Place: ${escapeLatex(declaration.place || "________")}`);
        if (declaration.showDate) leftParts.push(`Date: ${escapeLatex(declaration.date || "________")}`);
        const rightPart = declaration.showSignature
          ? declaration.showSignatureName && declaration.signatureName
            ? escapeLatex(declaration.signatureName)
            : "Signature: ________"
          : "";
        lines.push(`    \\small ${leftParts.join(" \\quad ")} & \\small ${rightPart} \\\\`);
        lines.push("\\end{tabular*}", "");
      }
    },

    custom: () => {
      if (!custom.enabled || !(custom.title.trim() || custom.body.trim())) return;
      lines.push(`%-----------${escapeLatex(custom.title).toUpperCase()}-----------`);
      lines.push(`\\section{${escapeLatex(custom.title || "Custom Section")}}`);
      lines.push(`\\small{${escapeLatex(custom.body)}}`, "");
    },

    custom2: () => {
      if (!custom2.enabled || !(custom2.title.trim() || custom2.body.trim())) return;
      lines.push(`%-----------${escapeLatex(custom2.title).toUpperCase()}-----------`);
      lines.push(`\\section{${escapeLatex(custom2.title || "Custom Section 2")}}`);
      lines.push(`\\small{${escapeLatex(custom2.body)}}`, "");
    },

    custom3: () => {
      if (!custom3.enabled || !(custom3.title.trim() || custom3.body.trim())) return;
      lines.push(`%-----------${escapeLatex(custom3.title).toUpperCase()}-----------`);
      lines.push(`\\section{${escapeLatex(custom3.title || "Custom Section 3")}}`);
      lines.push(`\\small{${escapeLatex(custom3.body)}}`, "");
    },
  };

  sectionOrder.forEach((id) => {
    sectionBuilders[id]?.();
  });

  lines.push("\\end{document}");
  return lines.join("\n");
}

