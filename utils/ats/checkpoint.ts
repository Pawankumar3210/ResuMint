import { createId } from "@/lib/id";
import type { AtsAnalysis, AtsCheckpoint } from "@/types/ats";

export function jobDescriptionFingerprint(jobDescription: string): string {
  const text = jobDescription.trim().replace(/\s+/g, " ");
  let hash = 5381;

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  }

  return `${(hash >>> 0).toString(36)}:${text.length}`;
}

export function createAtsCheckpoint(
  analysis: AtsAnalysis,
  jobDescription: string
): AtsCheckpoint {
  return {
    id: createId(),
    createdAt: Date.now(),
    jobFingerprint: jobDescriptionFingerprint(jobDescription),
    jobMatch: analysis.scores.jobMatch,
    readiness: analysis.scores.readiness,
    criticalMatched: analysis.scores.criticalMatched,
    criticalTotal: analysis.scores.criticalTotal,
    matchedKeywords: analysis.scores.matchedKeywords,
    totalKeywords: analysis.scores.totalKeywords,
    missingCritical: analysis.keywords
      .filter(
        (keyword) =>
          keyword.priority === "critical" && keyword.coverage === "none"
      )
      .map((keyword) => keyword.label),
  };
}

export function checkpointMatchesJob(
  checkpoint: AtsCheckpoint,
  jobDescription: string
): boolean {
  return checkpoint.jobFingerprint === jobDescriptionFingerprint(jobDescription);
}
