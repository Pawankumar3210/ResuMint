"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { Button } from "@/components/ui/button";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";

export function AchievementsSection() {
  const {
    resume,
    addAchievement,
    updateAchievement,
    removeAchievement,
    moveAchievement,
    setAchievementsEnabled,
  } = useResume();
  const [draft, setDraft] = useState("");

  const commit = () => {
    if (!draft.trim()) return;
    addAchievement(draft);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
        <input
          type="checkbox"
          checked={resume.achievementsEnabled}
          onChange={(e) => setAchievementsEnabled(e.target.checked)}
          className="h-4 w-4 rounded accent-primary transition-transform"
        />
        Include an achievements section on my resume
      </label>

      <CollapsibleReveal show={resume.achievementsEnabled}>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder="e.g. Winner, Smart India Hackathon 2025"
            className="h-11 flex-1 rounded-input border border-glass-border bg-transparent px-3.5 text-sm text-foreground
                       glass-surface placeholder:text-foreground-secondary/60
                       transition-all duration-200 ease-out
                       focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <Button variant="secondary" size="sm" onClick={commit} aria-label="Add achievement">
            <Plus size={15} />
          </Button>
        </div>

        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {resume.achievements.map((a, index) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 rounded-input border border-glass-border bg-muted/40 pl-3.5 pr-1.5 py-1.5"
              >
                <input
                  value={a.text}
                  onChange={(e) => updateAchievement(a.id, { text: e.target.value })}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => moveAchievement(a.id, "up")}
                  disabled={index === 0}
                  aria-label="Move achievement up"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-foreground-secondary
                             transition-colors hover:bg-muted hover:text-foreground
                             disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => moveAchievement(a.id, "down")}
                  disabled={index === resume.achievements.length - 1}
                  aria-label="Move achievement down"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-foreground-secondary
                             transition-colors hover:bg-muted hover:text-foreground
                             disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => removeAchievement(a.id)}
                  aria-label="Remove achievement"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-error/15 hover:text-error"
                >
                  <X size={13} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </CollapsibleReveal>
    </div>
  );
}
