"use client";

import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/builder/entry-card";
import { MAX_PROJECTS, MAX_PROJECT_DESCRIPTION_LENGTH } from "@/constants/resume-defaults";
import { isValidUrl } from "@/utils/resumeValidation";

export function ProjectsSection() {
  const { resume, addProject, updateProject, removeProject, moveProject, duplicateProject } = useResume();
  const atLimit = resume.projects.length >= MAX_PROJECTS;

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {resume.projects.map((entry, index) => (
          <EntryCard
            key={entry.id}
            title={entry.name || `Project ${index + 1}`}
            onRemove={() => removeProject(entry.id)}
            onDuplicate={atLimit ? undefined : () => duplicateProject(entry.id)}
            onMoveUp={() => moveProject(entry.id, "up")}
            onMoveDown={() => moveProject(entry.id, "down")}
            canMoveUp={index > 0}
            canMoveDown={index < resume.projects.length - 1}
          >
            <Input
              label="Project Name"
              value={entry.name}
              onChange={(e) => updateProject(entry.id, { name: e.target.value })}
              placeholder="CampusLink - College Social Graph"
            />
            <Textarea
              label="Description"
              value={entry.description}
              onChange={(e) =>
                updateProject(entry.id, {
                  description: e.target.value.slice(0, MAX_PROJECT_DESCRIPTION_LENGTH),
                })
              }
              maxLength={MAX_PROJECT_DESCRIPTION_LENGTH}
              placeholder="Real-time feed and DMs, 1.2k MAU in first month. Optimized feed query from O(n^2) to O(n log n)."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="GitHub URL"
                optional
                value={entry.githubUrl}
                onChange={(e) => updateProject(entry.id, { githubUrl: e.target.value })}
                placeholder="github.com/aaravmehta/campuslink"
                error={entry.githubUrl && !isValidUrl(entry.githubUrl) ? "Enter a valid URL." : undefined}
              />
              <Input
                label="Live Demo URL"
                optional
                value={entry.liveUrl}
                onChange={(e) => updateProject(entry.id, { liveUrl: e.target.value })}
                placeholder="campuslink.app"
                error={entry.liveUrl && !isValidUrl(entry.liveUrl) ? "Enter a valid URL." : undefined}
              />
            </div>
          </EntryCard>
        ))}
      </AnimatePresence>

      <Button
        variant="secondary"
        size="sm"
        onClick={addProject}
        disabled={atLimit}
        className="self-start"
      >
        <Plus size={15} /> {atLimit ? "5 project limit reached" : "Add Project"}
      </Button>
    </div>
  );
}
