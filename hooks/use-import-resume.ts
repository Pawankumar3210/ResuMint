"use client";

import { useCallback, useState } from "react";
import { useResume } from "./use-resume";
import { extractRawText, parseResumeText, type ParsedResumeResult } from "@/utils/resumeParser";
import type { ImportStage, ImportSelection } from "@/types/import";
import type { ReorderableSectionId, SectionId } from "@/types/resume";
import { isNonEmpty } from "@/utils/resumeValidation";
import { importLoadState } from "@/lib/programmatic-load-state";
import { DEFAULT_SECTION_ORDER } from "@/constants/resume-defaults";

/** Sections the importer attempts to detect and allows the person to select. */
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
  "declaration",
];

const REORDERABLE_IMPORT_SECTIONS: ReorderableSectionId[] = [
  "summary",
  "education",
  "experience",
  "projects",
  "skills",
  "certifications",
  "achievements",
  "languages",
  "declaration",
];

function mergeSectionOrder(order: ReorderableSectionId[]): ReorderableSectionId[] {
  const seen = new Set<ReorderableSectionId>();
  const merged: ReorderableSectionId[] = [];
  for (const id of [...order, ...DEFAULT_SECTION_ORDER]) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}

function hasCustomisedSectionOrder(resume: ReturnType<typeof useResume>["resume"]): boolean {
  if (resume.sectionOrder.length !== DEFAULT_SECTION_ORDER.length) return true;
  return resume.sectionOrder.some((id, index) => id !== DEFAULT_SECTION_ORDER[index]);
}

function isResumeEffectivelyEmpty(resume: ReturnType<typeof useResume>["resume"]): boolean {
  if (hasCustomisedSectionOrder(resume)) return false;
  if (isNonEmpty(resume.summary.text)) return false;
  if (resume.education.length || resume.experience.length || resume.projects.length) return false;
  if (resume.skills.length || resume.certifications.length || resume.achievements.length) return false;
  if (resume.languages.length) return false;
  if (resume.declaration.text.trim() || resume.declaration.place.trim() || resume.declaration.date.trim()) {
    return false;
  }
  if (resume.custom.enabled && resume.custom.body.trim()) return false;
  if (resume.custom2.enabled && resume.custom2.body.trim()) return false;
  if (resume.custom3.enabled && resume.custom3.body.trim()) return false;
  return true;
}

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
      if (id === "declaration") {
        return !(
          isNonEmpty(resume.declaration.text) ||
          isNonEmpty(resume.declaration.place) ||
          isNonEmpty(resume.declaration.date)
        );
      }
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
        let parsed;
        if (file.name.toLowerCase().endsWith(".json")) {
          // JSON Resume import -- dynamically imported, same lazy-loading
          // pattern as PDF/DOCX to keep it out of the initial bundle.
          const { parseJsonResume } = await import("@/utils/jsonResume");
          const text = await file.text();
          parsed = parseJsonResume(text);
        } else {
          const text = await extractRawText(file);
          parsed = parseResumeText(text);
        }
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
                : id === "declaration"
                  ? !!(
                      parsed.data.declaration?.text ||
                      parsed.data.declaration?.place ||
                      parsed.data.declaration?.date
                    )
                  : Array.isArray(parsed.data[id]) && (parsed.data[id] as unknown[]).length > 0;
          defaults[id] = detected && isSectionEmpty(id);
        }
        setSelection(defaults);
        setStage("preview");
      } catch {
        setErrorMessage("Unable to import this resume. Please try another PDF, DOCX, or JSON file.");
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

    const resumeWasEmpty = isResumeEffectivelyEmpty(resume);
    const next = { ...resume };
    const imported = new Set<ReorderableSectionId>();

    if (selection.personal && result.data.personal) {
      next.personal = { ...resume.personal };
      for (const [key, value] of Object.entries(result.data.personal)) {
        const k = key as keyof typeof next.personal;
        if (!isNonEmpty(next.personal[k]) && value) next.personal[k] = value as string;
      }
    }
    if (selection.summary && result.data.summary) {
      next.summary = result.data.summary;
      next.summaryEnabled = true;
      imported.add("summary");
    }
    if (selection.education && result.data.education) {
      next.education = result.data.education;
      next.educationEnabled = true;
      imported.add("education");
    }
    if (selection.experience && result.data.experience) {
      next.experience = result.data.experience;
      imported.add("experience");
    }
    if (selection.projects && result.data.projects) {
      next.projects = result.data.projects;
      imported.add("projects");
    }
    if (selection.skills && result.data.skills) {
      next.skills = result.data.skills;
      if (result.data.skillCategories?.length) next.skillCategories = result.data.skillCategories;
      imported.add("skills");
    }
    if (selection.certifications && result.data.certifications) {
      next.certifications = result.data.certifications;
      next.certificationsEnabled = true;
      imported.add("certifications");
    }
    if (selection.achievements && result.data.achievements) {
      next.achievements = result.data.achievements;
      next.achievementsEnabled = true;
      imported.add("achievements");
    }
    if (selection.languages && result.data.languages) {
      next.languages = result.data.languages;
      next.languagesEnabled = true;
      imported.add("languages");
    }
    if (selection.declaration && result.data.declaration) {
      next.declaration = { ...result.data.declaration, enabled: true };
      imported.add("declaration");
    }

    if (resumeWasEmpty) {
      const detectedOrder = (result.sectionOrder ?? []).filter(
        (id) => REORDERABLE_IMPORT_SECTIONS.includes(id) && imported.has(id)
      );
      next.sectionOrder = mergeSectionOrder(
        detectedOrder.length ? detectedOrder : DEFAULT_SECTION_ORDER
      );
    } else {
      next.sectionOrder = mergeSectionOrder(resume.sectionOrder);
    }

    importLoadState.active = true;
    setResume(next);
    reset();
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
