"use client";

import { createContext, useCallback, useMemo, useRef } from "react";
import type {
  Resume,
  PersonalDetails,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  CertificationEntry,
  AchievementEntry,
  LeadershipEntry,
  Declaration,
  CustomSection,
  ReorderableSectionId,
  SkillCategory,
} from "@/types/resume";
import { ExperienceType } from "@/types/resume";
import type { SavedResume, ResumeStore } from "@/types/resume-store";
import { EMPTY_RESUME, DEFAULT_RESUME_STORE, migrateResumeStore } from "@/constants/resume-defaults";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { createId } from "@/lib/id";

export interface ResumeContextValue {
  resume: Resume;
  hydrated: boolean;

  // Multi-resume list management -- see ResumeSwitcher. `resume` above
  // always reflects `activeResumeId`'s data, and every method below it
  // only ever reads/writes that one resume, so switching resumes can
  // never mix one resume's content into another.
  resumes: SavedResume[];
  activeResumeId: string;
  switchResume: (id: string) => void;
  createResume: (name?: string) => void;
  duplicateResume: (id: string) => void;
  renameResume: (id: string, name: string) => void;
  deleteResume: (id: string) => void;

  updatePersonal: (patch: Partial<PersonalDetails>) => void;
  updateSummary: (text: string) => void;

  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<EducationEntry>) => void;
  removeEducation: (id: string) => void;
  moveEducation: (id: string, direction: "up" | "down") => void;
  duplicateEducation: (id: string) => void;

  addExperience: () => void;
  updateExperience: (id: string, patch: Partial<ExperienceEntry>) => void;
  removeExperience: (id: string) => void;
  moveExperience: (id: string, direction: "up" | "down") => void;
  duplicateExperience: (id: string) => void;

  addProject: () => void;
  updateProject: (id: string, patch: Partial<ProjectEntry>) => void;
  removeProject: (id: string) => void;
  moveProject: (id: string, direction: "up" | "down") => void;
  duplicateProject: (id: string) => void;

  addSkill: (label: string, category: SkillCategory) => void;
  removeSkill: (id: string) => void;

  addCertification: () => void;
  updateCertification: (id: string, patch: Partial<CertificationEntry>) => void;
  removeCertification: (id: string) => void;
  moveCertification: (id: string, direction: "up" | "down") => void;
  duplicateCertification: (id: string) => void;

  addAchievement: (text: string) => void;
  updateAchievement: (id: string, patch: Partial<AchievementEntry>) => void;
  removeAchievement: (id: string) => void;
  moveAchievement: (id: string, direction: "up" | "down") => void;
  setAchievementsEnabled: (enabled: boolean) => void;

  addLeadership: () => void;
  updateLeadership: (id: string, patch: Partial<LeadershipEntry>) => void;
  removeLeadership: (id: string) => void;
  moveLeadership: (id: string, direction: "up" | "down") => void;
  duplicateLeadership: (id: string) => void;

  addLanguage: (label: string) => void;
  removeLanguage: (id: string) => void;

  addInterest: (label: string) => void;
  removeInterest: (id: string) => void;

  updateDeclaration: (patch: Partial<Declaration>) => void;

  updateCustomSection: (patch: Partial<CustomSection>) => void;

  /** Swaps a section with its immediate neighbor in resume.sectionOrder
   *  -- a no-op if it's already at that end, same convention as
   *  moveEntry. "personal" is never passed here; it's pinned first and
   *  isn't part of sectionOrder at all (see types/resume.ts). */
  moveSection: (id: ReorderableSectionId, direction: "up" | "down") => void;

  setResume: (resume: Resume) => void;
  clearResume: () => void;
  undo: () => void;
  redo: () => void;
}

export const ResumeContext = createContext<ResumeContextValue | null>(null);

const STORAGE_KEY = "resumint:resume-store";

interface History {
  past: Resume[];
  future: Resume[];
}

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const { value: store, setValue: setStoreRaw, hydrated } = useLocalStorage<ResumeStore>(
    STORAGE_KEY,
    DEFAULT_RESUME_STORE,
    migrateResumeStore
  );

  const activeResumeId = store.activeId;
  const resume = useMemo(
    () => store.resumes.find((r) => r.id === activeResumeId)?.data ?? EMPTY_RESUME,
    [store, activeResumeId]
  );

  // Session-only undo/redo history (not persisted -- a fresh page load
  // starts with a clean history, which matches how most editors behave),
  // kept PER RESUME so switching resumes can't let Ctrl+Z on one
  // accidentally undo an edit made on a different one -- each resume's
  // history is independent and preserved while you're away from it.
  // Refs rather than state: history bookkeeping doesn't need to trigger
  // re-renders on its own, only the resume value itself does.
  const historyRef = useRef<Map<string, History>>(new Map());
  const lastPushRef = useRef<Map<string, number>>(new Map());
  const HISTORY_LIMIT = 50;
  const COALESCE_MS = 800;

  const getHistory = useCallback((id: string): History => {
    let h = historyRef.current.get(id);
    if (!h) {
      h = { past: [], future: [] };
      historyRef.current.set(id, h);
    }
    return h;
  }, []);

  /**
   * Every resume mutation funnels through here, always reading and
   * writing only the CURRENTLY ACTIVE resume's data -- every other saved
   * resume in the list is left completely untouched by an edit, which is
   * what makes switching between resumes safe from ever mixing one
   * resume's content into another.
   *
   * Rapid-fire changes (i.e. typing) within COALESCE_MS of each other
   * collapse into a single history entry, so Ctrl+Z undoes "that edit"
   * rather than one keystroke at a time. Structural changes (add/remove
   * entry, clear, demo/import) always push immediately via
   * `discrete: true`.
   */
  const commit = useCallback(
    (updater: (prev: Resume) => Resume, opts?: { discrete?: boolean }) => {
      setStoreRaw((prevStore) => {
        const id = prevStore.activeId;
        const current = prevStore.resumes.find((r) => r.id === id);
        if (!current) return prevStore;

        const history = getHistory(id);
        const now = Date.now();
        const lastPush = lastPushRef.current.get(id) ?? 0;
        if (opts?.discrete || now - lastPush > COALESCE_MS) {
          history.past = [...history.past.slice(-(HISTORY_LIMIT - 1)), current.data];
        }
        lastPushRef.current.set(id, now);
        history.future = [];

        const nextData = updater(current.data);
        return {
          ...prevStore,
          resumes: prevStore.resumes.map((r) =>
            r.id === id ? { ...r, data: nextData, updatedAt: now } : r
          ),
        };
      });
    },
    [setStoreRaw, getHistory]
  );

  const undo = useCallback(() => {
    setStoreRaw((prevStore) => {
      const id = prevStore.activeId;
      const history = getHistory(id);
      const previous = history.past.pop();
      if (!previous) return prevStore;
      const current = prevStore.resumes.find((r) => r.id === id);
      if (!current) return prevStore;
      history.future = [...history.future, current.data];
      return {
        ...prevStore,
        resumes: prevStore.resumes.map((r) => (r.id === id ? { ...r, data: previous } : r)),
      };
    });
  }, [setStoreRaw, getHistory]);

  const redo = useCallback(() => {
    setStoreRaw((prevStore) => {
      const id = prevStore.activeId;
      const history = getHistory(id);
      const next = history.future.pop();
      if (!next) return prevStore;
      const current = prevStore.resumes.find((r) => r.id === id);
      if (!current) return prevStore;
      history.past = [...history.past, current.data];
      return {
        ...prevStore,
        resumes: prevStore.resumes.map((r) => (r.id === id ? { ...r, data: next } : r)),
      };
    });
  }, [setStoreRaw, getHistory]);

  // Generic patcher for the top-level "one object" sections (personal, summary, declaration, custom).
  const patchField = useCallback(
    <K extends "personal" | "summary" | "declaration" | "custom">(key: K, patch: Partial<Resume[K]>) => {
      commit((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    },
    [commit]
  );

  /** Swaps two adjacent entries in resume.sectionOrder -- mirrors
   *  moveEntry's swap-with-neighbor logic, but on a flat array of ids
   *  rather than an array of {id}-keyed objects. */
  const moveSection = useCallback(
    (id: ReorderableSectionId, direction: "up" | "down") => {
      commit(
        (prev) => {
          const order = prev.sectionOrder;
          const index = order.indexOf(id);
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (index === -1 || targetIndex < 0 || targetIndex >= order.length) return prev;
          const next = [...order];
          [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
          return { ...prev, sectionOrder: next };
        },
        { discrete: true }
      );
    },
    [commit]
  );

  // Generic helpers for the repeatable-entry sections (education, experience, ...).
  const addEntry = useCallback(
    <K extends keyof Resume>(key: K, entry: Resume[K] extends Array<infer E> ? E : never) => {
      commit(
        (prev) => ({ ...prev, [key]: [...(prev[key] as unknown[]), entry] } as Resume),
        { discrete: true }
      );
    },
    [commit]
  );

  const updateEntry = useCallback(
    <K extends keyof Resume>(
      key: K,
      id: string,
      patch: Resume[K] extends Array<infer E> ? Partial<E> : never
    ) => {
      commit((prev) => ({
        ...prev,
        [key]: (prev[key] as Array<{ id: string }>).map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      } as Resume));
    },
    [commit]
  );

  const removeEntry = useCallback(
    <K extends keyof Resume>(key: K, id: string) => {
      commit(
        (prev) => ({
          ...prev,
          [key]: (prev[key] as Array<{ id: string }>).filter((item) => item.id !== id),
        } as Resume),
        { discrete: true }
      );
    },
    [commit]
  );

  /** Swaps an entry with its immediate neighbor -- a no-op (returns prev
   *  unchanged) if it's already at that end of the list, so callers don't
   *  need to guard the call themselves. */
  const moveEntry = useCallback(
    <K extends keyof Resume>(key: K, id: string, direction: "up" | "down") => {
      commit(
        (prev) => {
          const list = prev[key] as Array<{ id: string }>;
          const index = list.findIndex((item) => item.id === id);
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (index === -1 || targetIndex < 0 || targetIndex >= list.length) return prev;
          const next = [...list];
          [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
          return { ...prev, [key]: next } as Resume;
        },
        { discrete: true }
      );
    },
    [commit]
  );

  /** Clones an entry with a fresh id, inserted directly after the
   *  original -- never the same id as the source, so editing the copy
   *  can never affect the original entry. */
  const duplicateEntry = useCallback(
    <K extends keyof Resume>(key: K, id: string) => {
      commit(
        (prev) => {
          const list = prev[key] as Array<{ id: string }>;
          const index = list.findIndex((item) => item.id === id);
          if (index === -1) return prev;
          const clone = { ...list[index], id: createId() };
          const next = [...list];
          next.splice(index + 1, 0, clone);
          return { ...prev, [key]: next } as Resume;
        },
        { discrete: true }
      );
    },
    [commit]
  );

  // Resume-list management -----------------------------------------

  const switchResume = useCallback(
    (id: string) => {
      setStoreRaw((prevStore) => {
        if (prevStore.activeId === id || !prevStore.resumes.some((r) => r.id === id)) return prevStore;
        return { ...prevStore, activeId: id };
      });
    },
    [setStoreRaw]
  );

  const createResume = useCallback(
    (name?: string) => {
      const id = createId();
      setStoreRaw((prevStore) => ({
        resumes: [
          ...prevStore.resumes,
          {
            id,
            name: name?.trim() || `Resume ${prevStore.resumes.length + 1}`,
            data: EMPTY_RESUME,
            updatedAt: Date.now(),
          },
        ],
        activeId: id,
      }));
    },
    [setStoreRaw]
  );

  const duplicateResume = useCallback(
    (id: string) => {
      const newId = createId();
      setStoreRaw((prevStore) => {
        const source = prevStore.resumes.find((r) => r.id === id);
        if (!source) return prevStore;
        return {
          resumes: [
            ...prevStore.resumes,
            { id: newId, name: `${source.name} (Copy)`, data: source.data, updatedAt: Date.now() },
          ],
          activeId: newId,
        };
      });
    },
    [setStoreRaw]
  );

  const renameResume = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setStoreRaw((prevStore) => ({
        ...prevStore,
        resumes: prevStore.resumes.map((r) => (r.id === id ? { ...r, name: trimmed } : r)),
      }));
    },
    [setStoreRaw]
  );

  const deleteResume = useCallback(
    (id: string) => {
      setStoreRaw((prevStore) => {
        if (prevStore.resumes.length <= 1) return prevStore; // always keep at least one
        const remaining = prevStore.resumes.filter((r) => r.id !== id);
        const activeId = prevStore.activeId === id ? remaining[0].id : prevStore.activeId;
        historyRef.current.delete(id);
        lastPushRef.current.delete(id);
        return { resumes: remaining, activeId };
      });
    },
    [setStoreRaw]
  );

  const value = useMemo<ResumeContextValue>(
    () => ({
      resume,
      hydrated,

      resumes: store.resumes,
      activeResumeId,
      switchResume,
      createResume,
      duplicateResume,
      renameResume,
      deleteResume,

      updatePersonal: (patch) => patchField("personal", patch),
      updateSummary: (text) => patchField("summary", { text }),

      addEducation: () =>
        addEntry("education", {
          id: createId(),
          institution: "",
          degree: "",
          branch: "",
          grade: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
        }),
      updateEducation: (id, patch) => updateEntry("education", id, patch),
      removeEducation: (id) => removeEntry("education", id),
      moveEducation: (id, direction) => moveEntry("education", id, direction),
      duplicateEducation: (id) => duplicateEntry("education", id),

      addExperience: () =>
        addEntry("experience", {
          id: createId(),
          type: ExperienceType.Internship,
          organization: "",
          role: "",
          description: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
          current: false,
        }),
      updateExperience: (id, patch) => updateEntry("experience", id, patch),
      removeExperience: (id) => removeEntry("experience", id),
      moveExperience: (id, direction) => moveEntry("experience", id, direction),
      duplicateExperience: (id) => duplicateEntry("experience", id),

      addProject: () =>
        addEntry("projects", {
          id: createId(),
          name: "",
          description: "",
          githubUrl: "",
          liveUrl: "",
        }),
      updateProject: (id, patch) => updateEntry("projects", id, patch),
      removeProject: (id) => removeEntry("projects", id),
      moveProject: (id, direction) => moveEntry("projects", id, direction),
      duplicateProject: (id) => duplicateEntry("projects", id),

      addSkill: (label, category) => {
        if (!label.trim()) return;
        addEntry("skills", { id: createId(), label: label.trim(), category });
      },
      removeSkill: (id) => removeEntry("skills", id),

      addCertification: () =>
        addEntry("certifications", {
          id: createId(),
          name: "",
          organization: "",
          month: "",
          year: "",
        }),
      updateCertification: (id, patch) => updateEntry("certifications", id, patch),
      removeCertification: (id) => removeEntry("certifications", id),
      moveCertification: (id, direction) => moveEntry("certifications", id, direction),
      duplicateCertification: (id) => duplicateEntry("certifications", id),

      addAchievement: (text) => {
        if (!text.trim()) return;
        addEntry("achievements", { id: createId(), text: text.trim() });
      },
      updateAchievement: (id, patch) => updateEntry("achievements", id, patch),
      removeAchievement: (id) => removeEntry("achievements", id),
      moveAchievement: (id, direction) => moveEntry("achievements", id, direction),
      setAchievementsEnabled: (enabled) => commit((prev) => ({ ...prev, achievementsEnabled: enabled })),

      addLeadership: () =>
        addEntry("leadership", {
          id: createId(),
          organization: "",
          role: "",
          description: "",
          startMonth: "",
          startYear: "",
          endMonth: "",
          endYear: "",
        }),
      updateLeadership: (id, patch) => updateEntry("leadership", id, patch),
      removeLeadership: (id) => removeEntry("leadership", id),
      moveLeadership: (id, direction) => moveEntry("leadership", id, direction),
      duplicateLeadership: (id) => duplicateEntry("leadership", id),

      addLanguage: (label) => {
        if (!label.trim()) return;
        addEntry("languages", { id: createId(), label: label.trim() });
      },
      removeLanguage: (id) => removeEntry("languages", id),

      addInterest: (label) => {
        if (!label.trim()) return;
        addEntry("interests", { id: createId(), label: label.trim() });
      },
      removeInterest: (id) => removeEntry("interests", id),

      updateDeclaration: (patch) => patchField("declaration", patch),

      updateCustomSection: (patch) => patchField("custom", patch),
      moveSection,

      setResume: (next) => commit(() => next, { discrete: true }),
      clearResume: () => commit(() => EMPTY_RESUME, { discrete: true }),
      undo,
      redo,
    }),
    [
      resume,
      hydrated,
      store,
      activeResumeId,
      switchResume,
      createResume,
      duplicateResume,
      renameResume,
      deleteResume,
      patchField,
      addEntry,
      updateEntry,
      removeEntry,
      moveEntry,
      duplicateEntry,
      moveSection,
      commit,
      undo,
      redo,
    ]
  );

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}
