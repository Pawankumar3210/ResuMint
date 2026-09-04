"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ResumeBuilder } from "./builder/resume-builder";
import { ResumePreview } from "./preview/resume-preview";
import { GlassCard } from "./ui/glass-card";

type MobileTab = "builder" | "preview";

/**
 * Desktop (lg+): both panels visible side by side, 40/60 split, per spec.
 * Mobile/tablet (below lg): only one panel visible at a time behind a
 * tab switcher, rather than stacking both full-height panels and forcing
 * a long scroll before ever reaching the preview.
 *
 * Both panels stay mounted at all times (just hidden via CSS on mobile)
 * so builder state, scroll position, and the accordion's open section
 * are never lost when switching tabs.
 */
export function BuilderPreviewPanels() {
  const [mobileTab, setMobileTab] = useState<MobileTab>("builder");

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Resume Builder and Preview"
        className="glass-surface flex rounded-input p-1 lg:hidden"
      >
        {(["builder", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 rounded-button px-3 py-2.5 text-sm font-medium capitalize transition-all duration-200 hover:scale-[1.02] active:scale-95",
              mobileTab === tab
                ? "bg-primary text-primary-foreground shadow-[0_0_14px_color-mix(in_srgb,var(--color-primary)_50%,transparent)]"
                : "text-foreground-secondary hover:text-foreground"
            )}
          >
            {tab === "builder" ? "Builder" : "Preview"}
          </button>
        ))}
      </div>

      <div className="grid h-[102vh] min-h-[816px] grid-cols-1 gap-6 lg:grid-cols-5">
        <div
          className={cn(
            "h-full min-h-0 lg:col-span-2 lg:block",
            mobileTab === "builder" ? "block" : "hidden"
          )}
        >
          <ResumeBuilder />
        </div>
        <GlassCard
          className={cn(
            "h-full min-h-0 overflow-hidden lg:col-span-3 lg:block",
            mobileTab === "preview" ? "block" : "hidden"
          )}
        >
          <ResumePreview />
        </GlassCard>
      </div>
    </div>
  );
}
