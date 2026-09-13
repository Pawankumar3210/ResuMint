"use client";

import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/builder/entry-card";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "@/constants/resume-defaults";

export function LeadershipSection() {
  const { resume, addLeadership, updateLeadership, removeLeadership } = useResume();

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {resume.leadership.map((entry, index) => (
          <EntryCard
            key={entry.id}
            title={entry.organization || `Position ${index + 1}`}
            onRemove={() => removeLeadership(entry.id)}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Organization"
                value={entry.organization}
                onChange={(e) => updateLeadership(entry.id, { organization: e.target.value })}
              />
              <Input
                label="Role"
                value={entry.role}
                onChange={(e) => updateLeadership(entry.id, { role: e.target.value })}
              />
              <Textarea
                label="Description"
                value={entry.description}
                onChange={(e) => updateLeadership(entry.id, { description: e.target.value })}
                className="sm:col-span-2"
              />
              <Select
                label="Start Month"
                options={MONTH_OPTIONS}
                value={entry.startMonth}
                onChange={(e) => updateLeadership(entry.id, { startMonth: e.target.value })}
              />
              <Select
                label="Start Year"
                options={YEAR_OPTIONS}
                value={entry.startYear}
                onChange={(e) => updateLeadership(entry.id, { startYear: e.target.value })}
              />
              <Select
                label="End Month"
                options={MONTH_OPTIONS}
                value={entry.endMonth}
                onChange={(e) => updateLeadership(entry.id, { endMonth: e.target.value })}
              />
              <Select
                label="End Year"
                options={YEAR_OPTIONS}
                value={entry.endYear}
                onChange={(e) => updateLeadership(entry.id, { endYear: e.target.value })}
              />
            </div>
          </EntryCard>
        ))}
      </AnimatePresence>

      <Button variant="secondary" size="sm" onClick={addLeadership} className="self-start">
        <Plus size={15} /> Add Position
      </Button>
    </div>
  );
}
