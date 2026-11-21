import { ATS_RELATED_SKILLS } from "@/constants/ats-related-skills";
import type { ResumeEvidenceSegment } from "./resumeIndex";
import { matchKeywordInResume } from "./resumeIndex";

export function findRelatedSkills(
  keywordId: string,
  keywordLabel: string,
  segments: ResumeEvidenceSegment[]
): string[] {
  const key = keywordId.replace(/^tax:/, "");
  const candidates = ATS_RELATED_SKILLS[key] ?? [];
  const related: string[] = [];
  const seen = new Set([keywordLabel.toLowerCase()]);

  for (const candidate of candidates) {
    if (seen.has(candidate.toLowerCase())) continue;
    seen.add(candidate.toLowerCase());

    const match = matchKeywordInResume(candidate, [], segments);
    if (match.coverage === "none") continue;

    related.push(candidate);
    if (related.length === 2) break;
  }

  return related;
}
