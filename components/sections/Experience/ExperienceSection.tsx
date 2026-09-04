"use client";

import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/builder/entry-card";
import { MONTH_OPTIONS, YEAR_OPTIONS, EXPERIENCE_TYPE_OPTIONS } from "@/constants/resume-defaults";

export function ExperienceSection() {
  const { resume, addExperience, updateExperience, removeExperience, moveExperience, duplicateExperience } = useResume();

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {resume.experience.map((entry, index) => (
          <EntryCard
            key={entry.id}
            title={entry.organization || `Experience ${index + 1}`}
            onRemove={() => removeExperience(entry.id)}
            onDuplicate={() => duplicateExperience(entry.id)}
            onMoveUp={() => moveExperience(entry.id, "up")}
            onMoveDown={() => moveExperience(entry.id, "down")}
            canMoveUp={index > 0}
            canMoveDown={index < resume.experience.length - 1}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Type"
                options={EXPERIENCE_TYPE_OPTIONS}
                value={entry.type}
                onChange={(e) =>
                  updateExperience(entry.id, { type: e.target.value as typeof entry.type })
                }
              />
              <Input
                label="Organization"
                value={entry.organization}
                onChange={(e) => updateExperience(entry.id, { organization: e.target.value })}
                placeholder="Zenlytics"
              />
              <Input
                label="Role"
                value={entry.role}
                onChange={(e) => updateExperience(entry.id, { role: e.target.value })}
                placeholder="Software Engineering Intern"
                className="sm:col-span-2"
              />
              <Textarea
                label="Description"
                value={entry.description}
                onChange={(e) => updateExperience(entry.id, { description: e.target.value })}
                className="sm:col-span-2"
                placeholder="Built a real-time analytics dashboard used by 500+ internal users, reducing report generation time by 40%."
              />
              <Select
                label="Start Month"
                options={MONTH_OPTIONS}
                value={entry.startMonth}
                onChange={(e) => updateExperience(entry.id, { startMonth: e.target.value })}
              />
              <Select
                label="Start Year"
                options={YEAR_OPTIONS}
                value={entry.startYear}
                onChange={(e) => updateExperience(entry.id, { startYear: e.target.value })}
              />

              <label className="flex items-center gap-2 text-sm text-foreground-secondary sm:col-span-2">
                <input
                  type="checkbox"
                  checked={entry.current}
                  onChange={(e) => updateExperience(entry.id, { current: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary"
                />
                I currently work / volunteer here
              </label>

              {!entry.current && (
                <>
                  <Select
                    label="End Month"
                    options={MONTH_OPTIONS}
                    value={entry.endMonth}
                    onChange={(e) => updateExperience(entry.id, { endMonth: e.target.value })}
                  />
                  <Select
                    label="End Year"
                    options={YEAR_OPTIONS}
                    value={entry.endYear}
                    onChange={(e) => updateExperience(entry.id, { endYear: e.target.value })}
                  />
                </>
              )}
            </div>
          </EntryCard>
        ))}
      </AnimatePresence>

      <Button variant="secondary" size="sm" onClick={addExperience} className="self-start">
        <Plus size={15} /> Add Experience
      </Button>
    </div>
  );
}
