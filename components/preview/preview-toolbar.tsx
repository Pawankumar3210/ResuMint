"use client";

import { motion } from "framer-motion";
import { Trash2, Download, Sparkles, Loader2 } from "lucide-react";
import { useDemoResume } from "@/hooks/use-demo-resume";
import { useToast } from "@/hooks/use-toast";

export function PreviewToolbar({
  onDownloadClick,
  onClearClick,
}: {
  onDownloadClick: () => void;
  onClearClick: () => void;
}) {
  const { loadDemoResume, isLoadingDemo } = useDemoResume();
  const { showToast } = useToast();

  const handleDemo = () => {
    loadDemoResume().then(() => showToast("Demo Loaded", "success"));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
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
      {/* flex-wrap on the outer row (above) is a safety net; collapsing
          each button to icon-only below `sm` is the real fix -- three
          full-text buttons plus the heading need ~430px+ and don't fit
          in a mobile preview panel with maybe 250-295px available,
          which (since this row's parent has overflow-hidden) meant the
          Download button -- the single most important action here --
          could get silently clipped off-screen. Same `hidden sm:inline`
          pattern SearchTrigger already uses; aria-label on each button
          keeps them accessible when their text is visually hidden. */}
      <div className="flex flex-wrap items-center gap-2">
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
