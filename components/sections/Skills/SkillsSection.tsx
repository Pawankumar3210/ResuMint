"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, ChevronDown, Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { TagInput } from "@/components/ui/tag-input";
import { SKILL_CATEGORY_META } from "@/constants/resume-defaults";
import { cn } from "@/lib/utils";

/** Inline editable label for a skill category header. */
function EditableCategoryLabel({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEditing = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-1 items-center gap-1.5 min-w-0">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          className="flex-1 min-w-0 rounded-[6px] border border-primary/50 bg-transparent
                     px-2 py-0.5 text-xs font-semibold text-foreground
                     focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Save category name"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-success hover:bg-success/10"
        >
          <Check size={12} />
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel editing"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground-secondary hover:bg-muted"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title="Click to rename category"
      aria-label={`Rename category: ${value}`}
      className={cn(
        "group/label flex flex-1 min-w-0 items-center gap-1.5 text-left",
        "font-mono text-xs font-semibold uppercase tracking-wide text-foreground-secondary",
        "hover:text-foreground transition-colors"
      )}
    >
      <span className="truncate">{value}</span>
      <Pencil
        size={10}
        className="shrink-0 opacity-0 group-hover/label:opacity-50 transition-opacity"
      />
    </button>
  );
}

export function SkillsSection() {
  const {
    resume,
    addSkill,
    removeSkill,
    addSkillCategory,
    removeSkillCategory,
    updateSkillCategory,
    moveSkillCategory,
  } = useResume();

  const categories = resume.skillCategories ?? [];

  // --- Add-new-category inline form state ---
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");

  const commitNewCategory = () => {
    const trimmed = newCategoryLabel.trim();
    if (trimmed) addSkillCategory(trimmed);
    setNewCategoryLabel("");
    setAddingCategory(false);
  };

  const cancelNewCategory = () => {
    setNewCategoryLabel("");
    setAddingCategory(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {categories.map((cat, index) => {
          // Fall back to SKILL_CATEGORY_META for placeholder/suggestions on
          // the four built-in categories; custom ones get a generic prompt.
          const meta = SKILL_CATEGORY_META[cat.id] ?? {
            placeholder: "Type a skill and press Enter",
            suggestions: [],
          };
          const catSkills = resume.skills.filter((s) => s.category === cat.id);
          const isFirst = index === 0;
          const isLast = index === categories.length - 1;

          return (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-input border border-glass-border bg-muted/40 p-4 transition-colors duration-200 hover:border-primary/30"
            >
              {/* Category header row */}
              <div className="mb-3 flex items-center gap-1">
                <EditableCategoryLabel
                  value={cat.label}
                  onSave={(next) => updateSkillCategory(cat.id, next)}
                />

                {/* Reorder + delete controls */}
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSkillCategory(cat.id, "up")}
                    disabled={isFirst}
                    aria-label={`Move "${cat.label}" category up`}
                    className="flex h-6 w-6 items-center justify-center rounded-button text-foreground-secondary
                               transition-colors hover:bg-muted hover:text-foreground
                               disabled:pointer-events-none disabled:opacity-25"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSkillCategory(cat.id, "down")}
                    disabled={isLast}
                    aria-label={`Move "${cat.label}" category down`}
                    className="flex h-6 w-6 items-center justify-center rounded-button text-foreground-secondary
                               transition-colors hover:bg-muted hover:text-foreground
                               disabled:pointer-events-none disabled:opacity-25"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSkillCategory(cat.id)}
                    aria-label={`Delete "${cat.label}" category and its skills`}
                    className="flex h-6 w-6 items-center justify-center rounded-button text-foreground-secondary
                               transition-colors hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Skills tag-input for this category */}
              <TagInput
                label=""
                placeholder={meta.placeholder}
                items={catSkills}
                onAdd={(label) => addSkill(label, cat.id)}
                onRemove={removeSkill}
                suggestions={meta.suggestions}
                showCount
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add new category — inline form or trigger button */}
      <AnimatePresence initial={false}>
        {addingCategory ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 rounded-input border border-primary/40 bg-muted/30 px-3 py-2.5"
          >
            <input
              autoFocus
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitNewCategory(); }
                if (e.key === "Escape") cancelNewCategory();
              }}
              placeholder="Category name (e.g. Databases, Soft Skills)"
              className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-foreground-secondary/60
                         focus:outline-none"
            />
            <button
              type="button"
              onClick={commitNewCategory}
              disabled={!newCategoryLabel.trim()}
              aria-label="Add category"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-button bg-primary text-primary-foreground
                         transition-opacity disabled:opacity-40"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={cancelNewCategory}
              aria-label="Cancel adding category"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-foreground-secondary
                         transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAddingCategory(true)}
            className="flex items-center gap-2 rounded-input border border-dashed border-glass-border px-4 py-2.5
                       text-sm font-medium text-foreground-secondary
                       transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus size={14} />
            Add Skill Category
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
