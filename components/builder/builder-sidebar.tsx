"use client";

import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { useCompletion } from "@/hooks/use-completion";
import { useResume } from "@/hooks/use-resume";
import { SECTION_META } from "@/constants/resume-defaults";

import { PersonalDetailsSection } from "@/components/sections/Personal/PersonalDetailsSection";
import { ProfessionalSummarySection } from "@/components/sections/Summary/ProfessionalSummarySection";
import { EducationSection } from "@/components/sections/Education/EducationSection";
import { ExperienceSection } from "@/components/sections/Experience/ExperienceSection";
import { ProjectsSection } from "@/components/sections/Projects/ProjectsSection";
import { SkillsSection } from "@/components/sections/Skills/SkillsSection";
import { CertificationsSection } from "@/components/sections/Certifications/CertificationsSection";
import { AchievementsSection } from "@/components/sections/Achievements/AchievementsSection";
import { LanguagesSection } from "@/components/sections/Languages/LanguagesSection";
import { DeclarationSection } from "@/components/sections/Declaration/DeclarationSection";
import { CustomSectionForm } from "@/components/sections/Custom/CustomSection";

const SECTION_COMPONENTS = {
  personal: PersonalDetailsSection,
  summary: ProfessionalSummarySection,
  education: EducationSection,
  experience: ExperienceSection,
  projects: ProjectsSection,
  skills: SkillsSection,
  certifications: CertificationsSection,
  achievements: AchievementsSection,
  languages: LanguagesSection,
  declaration: DeclarationSection,
  custom: CustomSectionForm,
} as const;

export function BuilderSidebar({
  activeSection,
  onActiveSectionChange,
}: {
  activeSection: string | null;
  onActiveSectionChange: (id: string | null) => void;
}) {
  const { statuses } = useCompletion();
  const { resume, moveSection } = useResume();

  return (
    <Accordion activeId={activeSection} onActiveChange={onActiveSectionChange}>
      {/* Personal Details is the resume's header (name/contact), not a
          repositionable section -- pinned first, no reorder controls,
          and deliberately excluded from resume.sectionOrder. */}
      <AccordionItem id="personal" title={SECTION_META.personal.label} status={statuses.personal}>
        <PersonalDetailsSection />
      </AccordionItem>

      {resume.sectionOrder.map((id, index) => {
        const SectionComponent = SECTION_COMPONENTS[id];
        return (
          <AccordionItem
            key={id}
            id={id}
            title={SECTION_META[id].label}
            status={statuses[id]}
            onMoveUp={() => moveSection(id, "up")}
            onMoveDown={() => moveSection(id, "down")}
            canMoveUp={index > 0}
            canMoveDown={index < resume.sectionOrder.length - 1}
          >
            <SectionComponent />
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
