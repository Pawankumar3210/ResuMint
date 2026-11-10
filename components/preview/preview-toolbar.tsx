"use client";

import { motion } from "framer-motion";
import { Trash2, Download, Sparkles, Loader2, AlignJustify, FileText, Columns2 } from "lucide-react";
import { useDemoResume } from "@/hooks/use-demo-resume";
import { useToast } from "@/hooks/use-toast";
import { useResume } from "@/hooks/use-resume";
import { cn } from "@/lib/utils";

export function PreviewToolbar({
  onDownloadClick,
  onClearClick,
}: {
  onDownloadClick: () => void;
  onClearClick: () => void;
}) {
  const { loadDemoResume, isLoadingDemo } = useDemoResume();
  const { showToast } = useToast();
  const { resume, setOnePageFit, setTemplate } = useResume();
  const currentTemplate = resume.template ?? "classic";

  const handleDemo = () => {
    loadDemoResume().then(() => showToast("Demo Loaded", "success"));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          <motion.span
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            Resume Preview
          </motion.span>
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Animated Sleek Template Switcher: Classic vs Modern with gliding spring pill */}
        <div
          role="radiogroup"
          aria-label="Resume template style"
          className="relative inline-flex items-center rounded-button border border-glass-border bg-popover/80 p-0.5 text-xs font-medium shadow-2xs backdrop-blur-xs"
        >
          <button
            type="button"
            role="radio"
            aria-checked={currentTemplate === "classic"}
            onClick={() => setTemplate("classic")}
            title="Classic: Single-column serif layout"
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors duration-200",
              currentTemplate === "classic"
                ? "text-primary-foreground font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            )}
          >
            {currentTemplate === "classic" && (
              <motion.span
                layoutId="active-template-pill"
                className="absolute inset-0 rounded-[6px] bg-primary shadow-xs"
                transition={{ type: "spring", stiffness: 480, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <FileText
                size={12}
                className={cn("transition-opacity", currentTemplate === "classic" ? "opacity-100" : "opacity-60")}
              />
              Classic
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={currentTemplate === "modern"}
            onClick={() => setTemplate("modern")}
            title="Modern: Two-column sans-serif layout"
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors duration-200",
              currentTemplate === "modern"
                ? "text-primary-foreground font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            )}
          >
            {currentTemplate === "modern" && (
              <motion.span
                layoutId="active-template-pill"
                className="absolute inset-0 rounded-[6px] bg-primary shadow-xs"
                transition={{ type: "spring", stiffness: 480, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Columns2
                size={12}
                className={cn("transition-opacity", currentTemplate === "modern" ? "opacity-100" : "opacity-60")}
              />
              Modern
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleDemo}
          disabled={isLoadingDemo}
          aria-label={isLoadingDemo ? "Loading demo resume" : "Try demo resume"}
          className="flex items-center gap-1.5 rounded-button border border-glass-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60 sm:px-3"
        >
          {isLoadingDemo ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          <span className="hidden sm:inline">{isLoadingDemo ? "Loading..." : "Try Demo Resume"}</span>
        </button>

        {/* Snap to 1 Page toggle -- compact styling that shows active state clearly */}
        <button
          type="button"
          onClick={() => setOnePageFit(!resume.onePageFit)}
          aria-label={resume.onePageFit ? "Disable 1-page fit" : "Snap to 1 page"}
          title={resume.onePageFit ? "1-Page Fit: ON — click to disable" : "Snap content to fit 1 page"}
          className={cn(
            "flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3",
            resume.onePageFit
              ? "border-primary/60 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-glass-border text-foreground-secondary hover:border-primary/40 hover:text-foreground"
          )}
        >
          <AlignJustify size={13} />
          <span className="hidden sm:inline">1-Page Fit</span>
        </button>

        <button
          type="button"
          onClick={onClearClick}
          aria-label="Clear resume"
          className="flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-error/10 hover:text-error sm:px-3"
        >
          <Trash2 size={13} /> <span className="hidden sm:inline">Clear</span>
        </button>
        <button
          type="button"
          onClick={onDownloadClick}
          aria-label="Download resume"
          className="flex items-center gap-1.5 rounded-button bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:-translate-y-[1px] hover:shadow-[0_0_20px_-4px_var(--color-primary)] active:translate-y-0 animate-cta-pulse sm:px-3.5"
        >
          <Download size={13} /> <span className="hidden sm:inline">Download ▾</span>
        </button>
      </div>
    </div>
  );
}
