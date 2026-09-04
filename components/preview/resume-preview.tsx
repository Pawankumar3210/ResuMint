"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { useResume } from "@/hooks/use-resume";
import { useDemoResume } from "@/hooks/use-demo-resume";
import { useToast } from "@/hooks/use-toast";
import { useRegisterAppAction } from "@/hooks/use-app-actions";
import { PreviewToolbar } from "./preview-toolbar";
import { ResumePaper, RESUME_PAPER_WIDTH_PX } from "./resume-paper";
import { DownloadDialog } from "@/components/dialogs/download-dialog";
import { SuccessDialog } from "@/components/dialogs/success-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";

/**
 * No debounce, no loading state -- resume comes straight from context and
 * React re-renders ResumePaper on every keystroke made anywhere in the
 * builder. ResumePaper itself always renders the full resume shape
 * (real content where present, muted placeholder examples where not),
 * so there's no jarring swap between "empty state" and "real resume" --
 * filling in one field only ever changes that one field.
 */
export function ResumePreview() {
  const { resume, clearResume } = useResume();
  const { loadDemoResume } = useDemoResume();
  const { showToast } = useToast();

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [downloadedFilename, setDownloadedFilename] = useState<string | null>(null);

  // Exposes these actions to the Command Palette / keyboard shortcuts.
  useRegisterAppAction("openDownloadDialog", () => setDownloadOpen(true));
  useRegisterAppAction("requestClearResume", () => setClearConfirmOpen(true));
  useRegisterAppAction("loadDemoResume", () => {
    loadDemoResume().then(() => showToast("Demo Loaded", "success"));
  });

  const availableWidthRef = useRef<HTMLDivElement>(null);
  const paperWrapperRef = useRef<HTMLDivElement>(null);
  const { scale, scaledHeight } = useShrinkToFit(availableWidthRef, paperWrapperRef, RESUME_PAPER_WIDTH_PX);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-6">
      <PreviewToolbar
        onDownloadClick={() => setDownloadOpen(true)}
        onClearClick={() => setClearConfirmOpen(true)}
      />

      {/* Two nested wrappers implement "shrink to fit" -- the resume
          paper itself always renders at its fixed natural width
          (RESUME_PAPER_WIDTH_PX) so its own text wrapping and page-break
          math never change with panel size (see resume-paper.tsx); this
          wrapper instead scales the whole thing down visually with CSS
          `transform` when the panel is narrower than that.
          - resume-scale-outer: sized to the *scaled* footprint (so it
            reserves the right amount of space in normal document flow
            and centers correctly -- transform alone doesn't shrink the
            layout box it's applied to, only its painted appearance).
          - resume-scale-wrapper: fixed at the natural width, scaled
            down from its top-left corner to fit inside the outer box.
          Both classes are reset to their natural (untransformed) state
          under @media print in globals.css -- a CSS `transform` on an
          ancestor creates a new containing block for the print
          stylesheet's `.resume-paper { position: fixed }` rule, which
          would otherwise silently break "fill the physical page" when
          this component happens to be mid-shrink. */}
      <div ref={availableWidthRef} className="w-full">
        <div
          className="resume-scale-outer mx-auto"
          style={{ width: RESUME_PAPER_WIDTH_PX * scale, height: scaledHeight || undefined }}
        >
          <motion.div
            ref={paperWrapperRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="resume-scale-wrapper rounded-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]"
            style={{ width: RESUME_PAPER_WIDTH_PX, transformOrigin: "top left", transform: `scale(${scale})` }}
          >
            <ResumePaper resume={resume} />
          </motion.div>
        </div>
      </div>

      <DownloadDialog
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        onDownloaded={(filename) => {
          setDownloadedFilename(filename);
          setDownloadOpen(false);
          setSuccessOpen(true);
          showToast("Resume Downloaded", "success");
        }}
      />
      <SuccessDialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        filename={downloadedFilename}
      />
      <ConfirmDialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          clearResume();
          showToast("Resume Cleared");
        }}
        title="Clear Resume?"
        description="This removes everything you've entered. This can't be undone."
        confirmLabel="Clear Resume"
      />
    </div>
  );
}

/**
 * Measures `containerRef`'s available width and `contentRef`'s natural
 * (unscaled) size, and returns the CSS `transform: scale()` factor that
 * shrinks `contentRef` down to fit within that width, plus the scaled
 * height to reserve for it in the surrounding layout.
 *
 * The key property this relies on: CSS `transform` is paint-only and
 * never affects layout-box metrics (`clientWidth`, `scrollHeight`,
 * `getBoundingClientRect` size under a transform notwithstanding --
 * we deliberately never call that here). So `contentRef.current
 * .scrollHeight`, read directly, always reflects `contentRef`'s natural,
 * untransformed height, even after we've applied a `scale()` transform
 * to that same element -- which is exactly what lets this be a stable,
 * non-circular measurement (scaling the content doesn't change the
 * number this hook reads back on the next resize).
 */
function useShrinkToFit(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  naturalWidth: number
): { scale: number; scaledHeight: number } {
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const compute = () => {
      const availableWidth = container.clientWidth;
      const nextScale = availableWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1;
      setScale(nextScale);
      setScaledHeight(content.scrollHeight * nextScale);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [containerRef, contentRef, naturalWidth]);

  return { scale, scaledHeight };
}
