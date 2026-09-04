"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { useCompletion } from "@/hooks/use-completion";
import { useRegisterAppAction } from "@/hooks/use-app-actions";
import { useToast } from "@/hooks/use-toast";
import { isProgrammaticLoadActive } from "@/lib/programmatic-load-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { ImportResumeDialog } from "@/components/dialogs/import-resume-dialog";
import { ResumeSwitcher } from "@/components/builder/resume-switcher";

export function BuilderHeader() {
  const { percentage } = useCompletion();
  const [importOpen, setImportOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { showToast } = useToast();
  const previousPercentage = useRef<number | null>(null);

  useRegisterAppAction("openImportDialog", () => setImportOpen(true));

  // Celebrate only a genuine transition into 100% during this session --
  // never on initial mount, even if the resume (e.g. restored from a
  // previous session, or freshly demo-loaded/imported) is already
  // complete when this component first renders. Also never when a demo
  // or imported resume reaches 100% -- see programmatic-load-state's doc
  // comment -- since the person didn't actually finish writing anything
  // themselves.
  useEffect(() => {
    const previous = previousPercentage.current;
    previousPercentage.current = percentage;

    if (previous === null) return; // first observation -- nothing to compare against yet
    if (percentage === 100 && previous < 100 && !isProgrammaticLoadActive()) {
      setShowConfetti(true);
      showToast("Resume Complete! 🎉", "success");
      const timer = setTimeout(() => setShowConfetti(false), 900);
      return () => clearTimeout(timer);
    }
  }, [percentage, showToast]);

  return (
    <div className="flex flex-col gap-4 border-b border-glass-border px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-mono text-base font-semibold tracking-tight text-foreground">
          <motion.span
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            Resume Builder
          </motion.span>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <ResumeSwitcher />
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-button px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
          >
            <Upload size={13} /> Import Resume
          </button>
        </div>
      </div>

      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-foreground-secondary">Resume Completion</span>
          <span className="font-medium tabular-nums text-foreground">{percentage}%</span>
        </div>
        <ProgressBar value={percentage} />
        {showConfetti && <ConfettiBurst />}
      </div>

      <ImportResumeDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
