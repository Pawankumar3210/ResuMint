"use client";

/**
 * MobilePreviewModal
 *
 * Full-screen, edge-to-edge resume preview modal for mobile devices.
 * Features:
 * - Spring entrance and exit animations
 * - Swipe-down-to-dismiss gesture with interactive drag threshold
 * - Unobstructed, high-fidelity view of the resume
 */
import { useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { X, Maximize2, Download } from "lucide-react";
import { ResumePaper, RESUME_PAPER_WIDTH_PX } from "./resume-paper";
import type { Resume } from "@/types/resume";

interface MobilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  resume: Resume;
  onDownloadClick?: () => void;
}

export function MobilePreviewModal({
  open,
  onClose,
  resume,
  onDownloadClick,
}: MobilePreviewModalProps) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 220], [1, 0.2]);
  const scale = useTransform(y, [0, 220], [1, 0.94]);

  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow swipe down if the scroll container is scrolled to the top
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop > 5) {
      isDragging.current = false;
      return;
    }
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        y.set(delta);
      } else {
        y.set(0);
      }
    },
    [y]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (y.get() > 90) {
      onClose();
      setTimeout(() => y.set(0), 200);
    } else {
      y.set(0);
    }
  }, [y, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col lg:hidden">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            key="modal-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            style={{ y, opacity, scale }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative flex h-full w-full flex-col overflow-hidden rounded-t-[28px] bg-background shadow-2xl"
          >
            {/* Header bar / Grab handle */}
            <div className="flex shrink-0 items-center justify-between border-b border-glass-border px-4 py-3 bg-card/60 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Maximize2 size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Full Preview
                  </h3>
                  <p className="text-[10px] text-foreground-secondary">
                    Swipe down or tap X to close
                  </p>
                </div>
              </div>

              {/* Grab pill indicator in center */}
              <div className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-zinc-400/40" />

              <div className="flex items-center gap-2">
                {onDownloadClick && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDownloadClick();
                    }}
                    className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90 active:scale-95"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close full preview"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-foreground transition-colors hover:bg-muted"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable edge-to-edge content */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto overscroll-contain bg-zinc-900/10 p-3 dark:bg-black/40"
            >
              <div
                className="mx-auto rounded-card shadow-lg"
                style={{
                  maxWidth: RESUME_PAPER_WIDTH_PX,
                  width: "100%",
                }}
              >
                <ResumePaper resume={resume} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
