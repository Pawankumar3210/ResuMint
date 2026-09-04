"use client";

import { useCallback, useState } from "react";
import { useResume } from "./use-resume";
import { extractRawText, parseResumeText, type ParsedResumeResult } from "@/utils/resumeParser";
import type { ImportStage, ImportSelection } from "@/types/import";
import type { SectionId } from "@/types/resume";
import { isNonEmpty } from "@/utils/resumeValidation";
import { importLoadState } from "@/lib/programmatic-load-state";

/** Sections we actually attempt to detect/import (dates & declaration are
 *  too free-form to parse reliably, so they're intentionally excluded). */
const IMPORTABLE_SECTIONS: SectionId[] = [
  "personal",
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "achievements",
  "languages",
];

export function useImportResume() {
  const { resume, setResume } = useResume();
  const [stage, setStage] = useState<ImportStage>("idle");
  const [result, setResult] = useState<ParsedResumeResult | null>(null);
  const [selection, setSelection] = useState<ImportSelection>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSectionEmpty = useCallback(
    (id: SectionId): boolean => {
      if (id === "personal") {
        return !Object.values(resume.personal).some(isNonEmpty);
      }
      if (id === "summary") return !isNonEmpty(resume.summary.text);
      const value = resume[id];
      return Array.isArray(value) ? value.length === 0 : true;
    },
    [resume]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setStage("parsing");
      setErrorMessage(null);
      try {
        const text = await extractRawText(file);
        const parsed = parseResumeText(text);
        setResult(parsed);

        // Default-check only sections that (a) were actually detected and
        // (b) are currently empty in the resume -- never pre-select an
        // overwrite of something the person already wrote themselves.
        const defaults: ImportSelection = {};
        for (const id of IMPORTABLE_SECTIONS) {
          const detected =
            id === "personal"
              ? parsed.summary.detectedName || parsed.summary.detectedEmail
              : id === "summary"
                ? !!parsed.data.summary?.text
                : Array.isArray(parsed.data[id]) && (parsed.data[id] as unknown[]).length > 0;
          defaults[id] = detected && isSectionEmpty(id);
        }
        setSelection(defaults);
        setStage("preview");
      } catch {
        setErrorMessage("Unable to import this resume. Please try another PDF or DOCX.");
        setStage("error");
      }
    },
    [isSectionEmpty]
  );

  const toggleSelection = useCallback((id: SectionId) => {
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setResult(null);
    setSelection({});
    setErrorMessage(null);
  }, []);

  const confirmImport = useCallback(() => {
    if (!result) return;

    const next = { ...resume };
    if (selection.personal && result.data.personal) {
      // Only fill fields the person hasn't already typed something into.
      next.personal = { ...resume.personal };
      for (const [key, value] of Object.entries(result.data.personal)) {
        const k = key as keyof typeof next.personal;
        if (!isNonEmpty(next.personal[k]) && value) next.personal[k] = value as string;
      }
    }
    if (selection.summary && result.data.summary) next.summary = result.data.summary;
    if (selection.education && result.data.education) next.education = result.data.education;
    if (selection.experience && result.data.experience) next.experience = result.data.experience;
    if (selection.projects && result.data.projects) next.projects = result.data.projects;
    if (selection.skills && result.data.skills) next.skills = result.data.skills;
    if (selection.certifications && result.data.certifications) {
      next.certifications = result.data.certifications;
    }
    if (selection.achievements && result.data.achievements) {
      next.achievements = result.data.achievements;
    }
    if (selection.languages && result.data.languages) next.languages = result.data.languages;

    importLoadState.active = true;
    setResume(next);
    reset();
    // One tick late, same reasoning as demoLoadState -- see its doc
    // comment -- so BuilderHeader's percentage-watching effect (triggered
    // by the setResume above) has already run and observed
    // importLoadState.active === true before it's cleared.
    setTimeout(() => {
      importLoadState.active = false;
    }, 150);
  }, [result, selection, resume, setResume, reset]);

  return {
    stage,
    result,
    selection,
    errorMessage,
    handleFile,
    toggleSelection,
    confirmImport,
    reset,
    isSectionEmpty,
  };
}
