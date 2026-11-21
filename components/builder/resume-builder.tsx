"use client";

import { useCallback, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { useRegisterAppAction } from "@/hooks/use-app-actions";
import { BuilderHeader } from "./builder-header";
import { BuilderSidebar } from "./builder-sidebar";
import type { SectionId } from "@/types/resume";

/**
 * Owns only the "which section is expanded" state. Resume data itself
 * lives in ResumeContext (global, per architecture spec) -- this
 * component is pure layout/orchestration.
 */
export function ResumeBuilder() {
  const [activeSection, setActiveSection] = useState<string | null>("personal");

  // Lets the Command Palette and ATS Insights expand AND scroll to a
  // section from anywhere in the app.
  const jumpToSection = useCallback((id: SectionId) => {
    setActiveSection(id);
    window.setTimeout(() => {
      const trigger = document.getElementById(`accordion-trigger-${id}`);
      if (!trigger) return;

      const scroller = trigger.closest<HTMLElement>("[data-resume-scroll]");
      if (scroller) {
        const top =
          trigger.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop;
        scroller.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
      } else {
        trigger.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      trigger.focus({ preventScroll: true });
    }, 420);
  }, []);

  useRegisterAppAction("jumpToSection", jumpToSection);

  return (
    <GlassCard className="flex h-full min-h-0 flex-col overflow-hidden">
      <BuilderHeader />
      {/* min-h-0 is required here: a flex item's default min-height is
          "auto" (fit-to-content), which silently defeats flex-1 +
          overflow-y-auto and lets this grow past the card's real height
          instead of scrolling internally. */}
      <div data-resume-scroll className="min-h-0 flex-1 overflow-y-auto">
        <BuilderSidebar activeSection={activeSection} onActiveSectionChange={setActiveSection} />
      </div>
    </GlassCard>
  );
}
