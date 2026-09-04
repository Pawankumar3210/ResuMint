import type { Resume } from "@/types/resume";

/** One saved resume in the person's list. Everything lives in
 *  localStorage -- `data` is a complete, independent Resume, never
 *  shared or merged with any other saved resume, so switching between
 *  them can never mix content from one into another. */
export interface SavedResume {
  id: string;
  name: string;
  data: Resume;
  updatedAt: number;
}

/** The whole multi-resume localStorage payload: every saved resume, plus
 *  which one is currently open in the builder. */
export interface ResumeStore {
  resumes: SavedResume[];
  activeId: string;
}
