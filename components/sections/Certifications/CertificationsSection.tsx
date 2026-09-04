"use client";

import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/builder/entry-card";
import { MONTH_OPTIONS, YEAR_OPTIONS } from "@/constants/resume-defaults";

export function CertificationsSection() {
  const { resume, addCertification, updateCertification, removeCertification, moveCertification, duplicateCertification } = useResume();

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence initial={false}>
        {resume.certifications.map((entry, index) => (
          <EntryCard
            key={entry.id}
            title={entry.name || `Certification ${index + 1}`}
            onRemove={() => removeCertification(entry.id)}
            onDuplicate={() => duplicateCertification(entry.id)}
            onMoveUp={() => moveCertification(entry.id, "up")}
            onMoveDown={() => moveCertification(entry.id, "down")}
            canMoveUp={index > 0}
            canMoveDown={index < resume.certifications.length - 1}
          >
            <Input
              label="Certificate Name"
              value={entry.name}
              onChange={(e) => updateCertification(entry.id, { name: e.target.value })}
              placeholder="AWS Certified Developer - Associate"
            />
            <Input
              label="Issuing Organization"
              value={entry.organization}
              onChange={(e) => updateCertification(entry.id, { organization: e.target.value })}
              placeholder="Amazon Web Services"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Month"
                options={MONTH_OPTIONS}
                value={entry.month}
                onChange={(e) => updateCertification(entry.id, { month: e.target.value })}
              />
              <Select
                label="Year"
                options={YEAR_OPTIONS}
                value={entry.year}
                onChange={(e) => updateCertification(entry.id, { year: e.target.value })}
              />
            </div>
          </EntryCard>
        ))}
      </AnimatePresence>

      <Button variant="secondary" size="sm" onClick={addCertification} className="self-start">
        <Plus size={15} /> Add Certification
      </Button>
    </div>
  );
}
