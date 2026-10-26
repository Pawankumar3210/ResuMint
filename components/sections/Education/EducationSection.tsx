"use client";

import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/builder/entry-card";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "@/constants/resume-defaults";

export function EducationSection() {
  const {
    resume,
    addEducation,
    updateEducation,
    removeEducation,
    moveEducation,
    duplicateEducation,
    setEducationEnabled,
  } = useResume();

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
        <input
          type="checkbox"
          checked={resume.educationEnabled}
          onChange={(e) => setEducationEnabled(e.target.checked)}
          className="h-4 w-4 rounded accent-primary transition-transform"
        />
        Include an education section on my resume
      </label>

      <CollapsibleReveal show={resume.educationEnabled}>
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
        {resume.education.map((entry, index) => (
          <EntryCard
            key={entry.id}
            title={entry.institution || `Education ${index + 1}`}
            onRemove={() => removeEducation(entry.id)}
            onDuplicate={() => duplicateEducation(entry.id)}
            onMoveUp={() => moveEducation(entry.id, "up")}
            onMoveDown={() => moveEducation(entry.id, "down")}
            canMoveUp={index > 0}
            canMoveDown={index < resume.education.length - 1}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Institution"
                value={entry.institution}
                onChange={(e) => updateEducation(entry.id, { institution: e.target.value })}
                placeholder="Vellore Institute of Technology"
              />
              <Input
                label="Degree"
                value={entry.degree}
                onChange={(e) => updateEducation(entry.id, { degree: e.target.value })}
                placeholder="B.Tech"
              />
              <Input
                label="Branch"
                value={entry.branch}
                onChange={(e) => updateEducation(entry.id, { branch: e.target.value })}
                placeholder="Computer Science"
              />
              <Input
                label="CGPA / Percentage"
                value={entry.grade}
                onChange={(e) => updateEducation(entry.id, { grade: e.target.value })}
                placeholder="9.1 CGPA"
              />
              <Select
                label="Start Month"
                options={MONTH_OPTIONS}
                value={entry.startMonth}
                onChange={(e) => updateEducation(entry.id, { startMonth: e.target.value })}
              />
              <Select
                label="Start Year"
                options={YEAR_OPTIONS}
                value={entry.startYear}
                onChange={(e) => updateEducation(entry.id, { startYear: e.target.value })}
              />
              <Select
                label="End Month"
                options={MONTH_OPTIONS}
                value={entry.endMonth}
                onChange={(e) => updateEducation(entry.id, { endMonth: e.target.value })}
              />
              <Select
                label="End Year"
                options={YEAR_OPTIONS}
                value={entry.endYear}
                onChange={(e) => updateEducation(entry.id, { endYear: e.target.value })}
              />
            </div>
          </EntryCard>
        ))}
      </AnimatePresence>

      <Button variant="secondary" size="sm" onClick={addEducation} className="self-start">
        <Plus size={15} /> Add Education
      </Button>
        </div>
      </CollapsibleReveal>
    </div>
  );
}
