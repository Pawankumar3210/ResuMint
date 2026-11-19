"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Download, Eye, Loader2, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { DENSITY_OPTIONS } from "@/constants/resume-defaults";
import { useResume } from "@/hooks/use-resume";
import { cn } from "@/lib/utils";
import type { Resume } from "@/types/resume";

type PreviewStatus = "loading" | "ready" | "error";

export function PagePreviewDialog({
  open,
  onClose,
  onDownloadClick,
  resume,
}: {
  open: boolean;
  onClose: () => void;
  onDownloadClick: () => void;
  resume: Resume;
}) {
  const { setDensity } = useResume();
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const handleClose = () => {
    setPdf(null);
    setNumPages(0);
    setStatus("loading");
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let disposed = false;
    let activeTask: { destroy: () => Promise<void> } | null = null;

    queueMicrotask(() => {
      if (!disposed) {
        setPdf(null);
        setNumPages(0);
        setStatus("loading");
      }
    });

    const load = async () => {
      try {
        const { generateResumePdfBlob } = await import("@/utils/pdfExport");
        const blob = await generateResumePdfBlob(resume, "two");
        if (disposed) return;

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const data = new Uint8Array(await blob.arrayBuffer());
        const loadingTask = pdfjsLib.getDocument({ data });
        activeTask = loadingTask;
        const loaded = await loadingTask.promise;

        if (disposed) {
          void loadingTask.destroy().catch(() => {});
          return;
        }

        setPdf(loaded);
        setNumPages(loaded.numPages);
        setStatus("ready");
      } catch {
        if (!disposed) setStatus("error");
      }
    };

    void load();

    return () => {
      disposed = true;
      // Let React unmount the page canvases and cancel their render tasks
      // before tearing down the PDF worker. Destroying it immediately
      // makes any in-flight `getPage()` reject with a null transport error.
      const task = activeTask;
      if (task) {
        window.setTimeout(() => {
          void task.destroy().catch(() => {});
        }, 500);
      }
    };
  }, [attempt, open, resume]);

  const pageLabel =
    status === "ready"
      ? `${numPages} A4 ${numPages === 1 ? "page" : "pages"}`
      : status === "error"
        ? "Preview unavailable"
        : "Counting pages...";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Resume A4 preview"
      unstyled
      hideCloseButton
      className="flex h-[min(92vh,980px)] max-w-5xl flex-col overflow-hidden rounded-dialog border border-glass-border bg-popover text-popover-foreground shadow-2xl"
    >
      <div className="relative grid gap-y-2 border-b border-glass-border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5 pr-10 sm:pr-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
            <Eye size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Preview</h2>
            <p className="truncate text-[11px] text-foreground-secondary">
              Exact A4 layout · {pageLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDownloadClick}
          aria-label="Download resume"
          className="flex items-center gap-1.5 justify-self-center rounded-button bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:-translate-y-[1px] hover:shadow-[0_0_20px_-4px_var(--color-primary)] active:translate-y-0"
        >
          <Download size={13} />
          <span>Download</span>
        </button>

        <div
          role="radiogroup"
          aria-label="Line density"
          className="flex justify-self-center rounded-full border border-glass-border bg-muted/50 p-0.5 text-[11px] font-medium sm:justify-self-end sm:pr-10"
        >
          {DENSITY_OPTIONS.map((option) => {
            const isActive = (resume.density ?? "standard") === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setDensity(option.id)}
                title={option.description}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground-secondary hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close preview"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-button text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground sm:right-4 sm:top-1/2 sm:-translate-y-1/2"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-zinc-200/70 p-4 dark:bg-black/40 sm:p-6">
        {status === "loading" && (
          <div className="mx-auto flex aspect-[210/297] w-full max-w-[820px] items-center justify-center rounded-sm bg-white shadow-[0_16px_45px_-18px_rgba(0,0,0,0.55)]">
            <div className="flex flex-col items-center gap-2 text-sm text-zinc-500">
              <Loader2 size={22} className="animate-spin" />
              <span>Generating A4 preview...</span>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card border border-glass-border bg-popover p-6 text-center">
            <p className="text-sm text-foreground-secondary">
              Couldn&apos;t generate the A4 preview.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="rounded-button bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && pdf && (
          <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6">
            {Array.from({ length: numPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <div key={pageNumber}>
                  <div className="overflow-hidden rounded-sm bg-white shadow-[0_16px_45px_-18px_rgba(0,0,0,0.55)]">
                    <PdfPageCanvas pdf={pdf} pageNumber={pageNumber} />
                  </div>
                  <p className="mt-2 text-center text-[11px] font-medium text-foreground-secondary">
                    Page {pageNumber} of {numPages}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-glass-border px-4 py-2.5 text-[11px] text-foreground-secondary sm:px-5">
        <span>A4 · 210 × 297 mm</span>
        <span>{pageLabel}</span>
      </div>
    </Dialog>
  );
}

function PdfPageCanvas({
  pdf,
  pageNumber,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    const render = async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: 2 });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      renderTask = page.render({ canvas, viewport });
      await renderTask.promise;
    };

    void render().catch((error: unknown) => {
      if (
        !cancelled &&
        !(error instanceof Error && error.name === "RenderingCancelledException")
      ) {
        console.error(error);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdf]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Resume page ${pageNumber}`}
      className="block h-auto w-full"
    />
  );
}
