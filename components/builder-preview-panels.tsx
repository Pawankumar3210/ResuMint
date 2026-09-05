"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
        {/* Each panel gets its own staggered slide-in-from-its-own-side +
            fade + blur-to-sharp entrance, rather than both just popping
            in together as part of the parent page fade -- builder from
            the left, preview from the right, echoing their actual
            left/right position on screen so the motion reads as "the
            two halves settling into place" rather than a generic fade.
            `will-change-transform` avoids a layout repaint hitch on
            lower-end devices during the (brief) animated phase. */}
        <motion.div
          initial={{ opacity: 0, x: -28, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "h-full min-h-0 will-change-transform lg:col-span-2 lg:block",
            mobileTab === "builder" ? "block" : "hidden"
          )}
        >
          <ResumeBuilder />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 28, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "h-full min-h-0 will-change-transform lg:col-span-3 lg:block",
            mobileTab === "preview" ? "block" : "hidden"
          )}
        >
          <GlassCard className="h-full min-h-0 overflow-hidden">
            <ResumePreview />
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
