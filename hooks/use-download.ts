"use client";

import { useCallback, useState } from "react";
import { useResume } from "./use-resume";
import { downloadBlob } from "@/lib/download-file";
import type { ExportFormat, PageLayout } from "@/types/export";

interface DownloadOptions {
  filename: string;
  format: ExportFormat;
  layout: PageLayout;
}

/**
 * @react-pdf/renderer and docx are both sizeable dependencies (the PDF
 * renderer especially) that only a fraction of visits will ever need --
 * most people spend their whole session in the builder before deciding
 * to download. Dynamically importing them here, rather than at module
 * top-level, keeps them out of the initial JS bundle entirely; they're
 * fetched only the moment someone actually clicks Download.
 */
export function useDownload() {
  const { resume } = useResume();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string | null>(null);

  const download = useCallback(
    async ({ filename, format, layout }: DownloadOptions) => {
      setIsDownloading(true);
      setError(null);

      // PDF/DOCX generation is CPU-heavy enough to block the main thread
      // for a noticeable stretch. Without yielding here first, that block
      // can start before the browser has actually painted the "Generating..."
      // state -- which was leaving glass/backdrop-filter elements stuck
      // mid-composite (a real, reported visual bug). Two animation frames
      // guarantees a real paint has completed before the heavy work begins.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      try {
        const safeName = filename.trim() || "Resume";
        if (format === "pdf") {
          const { generateResumePdfBlob } = await import("@/utils/pdfExport");
          const blob = await generateResumePdfBlob(resume, layout);
          downloadBlob(blob, `${safeName}.pdf`);
          setLastDownloadedFile(`${safeName}.pdf`);
        } else {
          const [{ buildResumeDocx }, { Packer }] = await Promise.all([
            import("@/utils/docxExport"),
            import("docx"),
          ]);
          const doc = buildResumeDocx(resume, layout);
          const blob = await Packer.toBlob(doc);
          downloadBlob(blob, `${safeName}.docx`);
          setLastDownloadedFile(`${safeName}.docx`);
        }
        return true;
      } catch {
        // Never expose technical errors to the user, per spec.
        setError("Unable to generate your resume. Please try again.");
        return false;
      } finally {
        setIsDownloading(false);
      }
    },
    [resume]
  );

  return { download, isDownloading, error, lastDownloadedFile, clearError: () => setError(null) };
}
