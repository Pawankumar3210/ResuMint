import type {
  AtsAnalysis,
  AtsCheckpoint,
  AtsKeyword,
  AtsReadinessStatus,
} from "@/types/ats";

export interface AtsReportOptions {
  analysis: AtsAnalysis;
  resumeName: string;
  candidateName?: string;
  checkpoint?: AtsCheckpoint;
  checkpointMatchesJob?: boolean;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function gapStatus(keyword: AtsKeyword): string {
  if (keyword.coverage === "none") return "missing";
  if (keyword.coverage === "skills") return "skills list only";
  if (keyword.coverage === "supporting") return "supporting sections only";
  return "experience or projects";
}

function readinessLabel(status: AtsReadinessStatus): string {
  if (status === "pass") return "PASS";
  if (status === "warning") return "WARNING";
  return "FAIL";
}

export function buildAtsReportText({
  analysis,
  resumeName,
  candidateName,
  checkpoint,
  checkpointMatchesJob = false,
}: AtsReportOptions): string {
  const lines: string[] = [];
  const blank = () => lines.push("");
  const heading = (title: string) => {
    blank();
    lines.push(title.toUpperCase());
    lines.push("-".repeat(title.length));
  };

  lines.push("RESUMINT ATS REPORT");
  lines.push(`Generated locally on ${formatDate(Date.now())}`);
  lines.push(`Resume: ${resumeName}`);
  if (candidateName) lines.push(`Candidate: ${candidateName}`);
  lines.push(`Role: ${analysis.roleTitle ?? "Not detected"}`);
  blank();
  lines.push(`Job Match: ${analysis.scores.jobMatch}/100`);
  lines.push(`ATS Readiness: ${analysis.scores.readiness}/100`);
  lines.push(
    `Must-have coverage: ${analysis.scores.criticalMatched}/${analysis.scores.criticalTotal}`
  );
  lines.push(
    `Keywords found: ${analysis.scores.matchedKeywords}/${analysis.scores.totalKeywords}`
  );

  if (checkpoint) {
    heading("Progress checkpoint");
    lines.push(`Saved: ${formatDate(checkpoint.createdAt)}`);

    if (!checkpointMatchesJob) {
      lines.push(
        "This checkpoint belongs to a different job description, so it is not compared here."
      );
    } else {
      const jobDelta = analysis.scores.jobMatch - checkpoint.jobMatch;
      const readinessDelta = analysis.scores.readiness - checkpoint.readiness;
      const currentMissing = analysis.keywords.filter(
        (keyword) =>
          keyword.priority === "critical" && keyword.coverage === "none"
      ).length;
      const missingDiff = currentMissing - checkpoint.missingCritical.length;
      const missingChange =
        missingDiff === 0
          ? "no change"
          : missingDiff > 0
            ? `${missingDiff} more`
            : `${Math.abs(missingDiff)} fewer`;
      const signed = (value: number) =>
        value > 0 ? `+${value}` : value < 0 ? String(value) : "0";

      lines.push(
        `Job Match: ${checkpoint.jobMatch} -> ${analysis.scores.jobMatch} (${signed(jobDelta)})`
      );
      lines.push(
        `ATS Readiness: ${checkpoint.readiness} -> ${analysis.scores.readiness} (${signed(readinessDelta)})`
      );
      lines.push(
        `Missing must-haves: ${checkpoint.missingCritical.length} -> ${currentMissing} (${missingChange})`
      );
    }
  }

  if (analysis.requirements.length > 0) {
    heading("Job requirements");
    for (const requirement of analysis.requirements) {
      lines.push(
        `[${requirement.status.toUpperCase()}] ${requirement.label}: ${requirement.detail}`
      );
    }
  }

  const weakCritical = analysis.keywords.filter(
    (keyword) => keyword.priority === "critical" && keyword.coverage !== "strong"
  );

  heading("Must-have gaps");
  if (weakCritical.length === 0) {
    lines.push("No must-have gaps were detected.");
  } else {
    for (const keyword of weakCritical) {
      const related = keyword.relatedSkills?.length
        ? ` Related in resume: ${keyword.relatedSkills.join(", ")}.`
        : "";
      lines.push(`- ${keyword.label} (${gapStatus(keyword)}).${related}`);
    }
  }

  heading("ATS checks");
  for (const check of analysis.readiness) {
    lines.push(`[${readinessLabel(check.status)}] ${check.label}: ${check.detail}`);
    if (check.suggestion) lines.push(`  Suggestion: ${check.suggestion}`);
  }

  heading("Recommended next steps");
  if (analysis.suggestions.length === 0) {
    lines.push("No urgent changes were detected.");
  } else {
    for (const suggestion of analysis.suggestions) {
      lines.push(`- ${suggestion.title}: ${suggestion.detail}`);
    }
  }

  blank();
  lines.push(
    "This report is a deterministic, local estimate based on visible wording. It is not a hiring prediction or a guarantee of ATS results."
  );

  return `${lines.join("\n").trim()}\n`;
}
