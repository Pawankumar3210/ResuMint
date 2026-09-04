import type { SectionId } from "./resume";

export type ImportStage = "idle" | "parsing" | "preview" | "error";

/** Which detected sections the person has chosen to bring into their resume. */
export type ImportSelection = Partial<Record<SectionId, boolean>>;
