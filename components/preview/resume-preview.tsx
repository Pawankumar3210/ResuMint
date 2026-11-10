"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Maximize2, Minimize2 } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { useDemoResume } from "@/hooks/use-demo-resume";
import { useToast } from "@/hooks/use-toast";
import { useRegisterAppAction } from "@/hooks/use-app-actions";
import { PreviewToolbar } from "./preview-toolbar";
import { ResumePaper, RESUME_PAPER_WIDTH_PX } from "./resume-paper";
import { DownloadDialog } from "@/components/dialogs/download-dialog";
import { SuccessDialog } from "@/components/dialogs/success-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

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
  const { scale: fitScale, naturalHeight, availableHeight } = useShrinkToFit(
    availableWidthRef,
    paperWrapperRef,
    RESUME_PAPER_WIDTH_PX
  );

  // Calculates the zoom scale factor needed to fit the ENTIRE resume height & width
  // inside the mobile viewport without scrolling.
  const fitPageZoom =
    availableHeight > 0 && naturalHeight > 0 && fitScale > 0
      ? Math.min(1, Math.max(MIN_ZOOM, (availableHeight - 32) / (naturalHeight * fitScale)))
      : 1;

  // Mobile-only manual zoom, layered on top of the automatic fit-to-width
  // scale -- 1 means "fit to width".
  // Resets to 1 whenever the resume's natural size changes.
  const [zoomLevel, setZoomLevel] = useState(1);
  const [prevNaturalHeight, setPrevNaturalHeight] = useState(naturalHeight);
  if (naturalHeight !== prevNaturalHeight) {
    setPrevNaturalHeight(naturalHeight);
    setZoomLevel(1);
  }

  const zoomLevelRef = useRef(zoomLevel);
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Touch pinch-to-zoom: scopes pinch gestures to ONLY zoom the resume canvas,
  // preventing the browser from zooming the entire page chrome.
  useEffect(() => {
    const container = availableWidthRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialZoom = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.hypot(dx, dy);
        initialZoom = zoomLevelRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        e.preventDefault(); // Prevents zooming the whole browser webpage
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / initialDistance;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(initialZoom * ratio).toFixed(2)));
        setZoomLevel(next);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const effectiveScale = fitScale * zoomLevel;
  const scaledWidth = RESUME_PAPER_WIDTH_PX * effectiveScale;
  const scaledHeight = naturalHeight * effectiveScale;

  const isFitPage = Math.abs(zoomLevel - fitPageZoom) < 0.04;
  const isFitWidth = Math.abs(zoomLevel - 1) < 0.04;

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-4 overflow-hidden p-3 sm:p-6">
      <PreviewToolbar
        onDownloadClick={() => setDownloadOpen(true)}
        onClearClick={() => setClearConfirmOpen(true)}
      />

      {/* Two nested wrappers implement "shrink to fit" -- the resume
          paper itself always renders at its fixed natural width
          (RESUME_PAPER_WIDTH_PX) so its own text wrapping and page-break
          math never change with panel size; this wrapper scales the
          whole thing down visually with CSS `transform` when the panel is
          narrower than that.
          Scoping zoom to just this scrollable area keeps everything else
          (navbar, toolbar, tabs) at a normal, tap-friendly scale. */}
      <div
        ref={availableWidthRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
        style={{ touchAction: "pan-x pan-y" }}
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

      {/* Mobile-only floating zoom control -- allows zooming in/out and snapping
          between "Fit Entire Page" (to see the whole resume at once) and "Fit Width". */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center lg:hidden">
        <div className="glass-surface pointer-events-auto flex items-center gap-1 rounded-full border border-glass-border p-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoomLevel <= MIN_ZOOM}
            aria-label="Zoom out resume"
            title="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (isFitPage) {
                setZoomLevel(1);
              } else {
                setZoomLevel(+fitPageZoom.toFixed(2));
              }
            }}
            aria-label={isFitPage ? "Fit resume to width" : "Fit entire resume on screen"}
            title={isFitPage ? "Fit to Width" : "Fit Entire Resume on Screen"}
            className="flex h-8 min-w-[5rem] items-center justify-center gap-1 rounded-full px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {isFitPage ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Minimize2 size={12} /> Fit Page
              </span>
            ) : isFitWidth ? (
              <span className="flex items-center gap-1 text-[11px] text-foreground-secondary hover:text-foreground">
                <Maximize2 size={12} /> Fit Width
              </span>
            ) : (
              <span className="text-[11px] font-medium tabular-nums text-primary">
                {Math.round(zoomLevel * 100)}%
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoomLevel >= MAX_ZOOM}
            aria-label="Zoom in resume"
            title="Zoom in"
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
 * Measures `containerRef`'s available width & height and `contentRef`'s natural
 * (unscaled) size, and returns the CSS `transform: scale()` factor that
 * shrinks `contentRef` down to fit within that width, plus dimensions so callers
 * can compute scaled footprints or "fit whole page" scaling factors.
 */
function useShrinkToFit(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  naturalWidth: number
): { scale: number; naturalHeight: number; availableHeight: number } {
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const compute = () => {
      const availableWidth = container.clientWidth;
      const height = container.clientHeight;
      const nextScale = availableWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1;
      setScale(nextScale);
      setAvailableHeight(height);
      setNaturalHeight(content.scrollHeight);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, [containerRef, contentRef, naturalWidth]);

  return { scale, naturalHeight, availableHeight };
}
