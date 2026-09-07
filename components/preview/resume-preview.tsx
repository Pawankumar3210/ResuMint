"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { useDemoResume } from "@/hooks/use-demo-resume";
import { useToast } from "@/hooks/use-toast";
import { useRegisterAppAction } from "@/hooks/use-app-actions";
import { PreviewToolbar } from "./preview-toolbar";
import { ResumePaper, RESUME_PAPER_WIDTH_PX } from "./resume-paper";
import { DownloadDialog } from "@/components/dialogs/download-dialog";
import { SuccessDialog } from "@/components/dialogs/success-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

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
  const { scale: fitScale, naturalHeight } = useShrinkToFit(availableWidthRef, paperWrapperRef, RESUME_PAPER_WIDTH_PX);

  // Mobile-only manual zoom, layered on top of the automatic fit-to-width
  // scale -- 1 means "exactly fit to width" (the previous, only behavior).
  // Resets to 1 whenever the resume's natural size changes (e.g. content
  // added/removed), so zoom doesn't compound weirdly across edits. Done
  // during render (not in an effect) per React's recommended pattern for
  // "reset state when a value changes" -- avoids the extra
  // render-then-effect-then-render cascade a useEffect version would need.
  const [zoomLevel, setZoomLevel] = useState(1);
  const [prevNaturalHeight, setPrevNaturalHeight] = useState(naturalHeight);
  if (naturalHeight !== prevNaturalHeight) {
    setPrevNaturalHeight(naturalHeight);
    setZoomLevel(1);
  }

  const effectiveScale = fitScale * zoomLevel;
  const scaledWidth = RESUME_PAPER_WIDTH_PX * effectiveScale;
  const scaledHeight = naturalHeight * effectiveScale;
  const isZoomedIn = zoomLevel > 1.001;

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6">
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
          this component happens to be mid-shrink.

          `effectiveScale` = the automatic fit-to-width scale x an
          optional manual zoom multiplier (mobile only, see the floating
          control below) -- zooming in past "fit width" is what that
          control drives, and this container scrolls in both directions
          so a zoomed-in resume can be panned around instead of forcing
          the WHOLE PAGE to pinch-zoom (which used to be the only way to
          read small text on a phone, and dragged the navbar/sidebar
          along with it -- scoping zoom to just this scrollable area
          keeps everything else at a normal, tap-sized scale). */}
      <div
        ref={availableWidthRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        style={{ touchAction: "pan-x pan-y pinch-zoom" }}
      >
        <div
          className="resume-scale-outer mx-auto"
          style={{ width: scaledWidth || undefined, height: scaledHeight || undefined }}
        >
          <motion.div
            ref={paperWrapperRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="resume-scale-wrapper rounded-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]"
            style={{
              width: RESUME_PAPER_WIDTH_PX,
              transformOrigin: "top left",
              transform: `scale(${effectiveScale})`,
            }}
          >
            <ResumePaper resume={resume} />
          </motion.div>
        </div>
      </div>

      {/* Mobile-only zoom control -- `absolute` against THIS panel (not
          `sticky` inside the scrolling area above), so it stays put on
          screen regardless of which direction the resume underneath is
          scrolled. Hidden on desktop (lg+): fit-to-width already shows
          the resume at a comfortably readable size there, so manual
          zoom has no real use case -- this is specifically for phones,
          where shrinking an A4 page down to a ~340px screen makes body
          text quite small. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center lg:hidden">
        <div className="glass-surface pointer-events-auto flex items-center gap-1 rounded-chip border border-glass-border p-1 shadow-lg">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoomLevel <= MIN_ZOOM}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(1)}
            aria-label="Reset zoom to fit width"
            title="Fit to width"
            className="flex h-8 min-w-[3.25rem] items-center justify-center gap-1 rounded-full px-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
          >
            {isZoomedIn ? `${Math.round(zoomLevel * 100)}%` : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoomLevel >= MAX_ZOOM}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Plus size={15} />
          </button>
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
 * shrinks `contentRef` down to fit within that width, plus its natural
 * (unscaled) height so callers can compute a scaled footprint themselves
 * (needed here since the mobile zoom control layers an extra multiplier
 * on top of this hook's own fit-to-width scale).
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
): { scale: number; naturalHeight: number } {
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const compute = () => {
      const availableWidth = container.clientWidth;
      const nextScale = availableWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1;
      setScale(nextScale);
      setNaturalHeight(content.scrollHeight);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [containerRef, contentRef, naturalWidth]);

  return { scale, naturalHeight };
}
