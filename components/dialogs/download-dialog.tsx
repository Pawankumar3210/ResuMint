"use client";

import { useState } from "react";
import { Download, Loader2, ClipboardCopy, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { useResume } from "@/hooks/use-resume";
import { useDownload } from "@/hooks/use-download";
import { useToast } from "@/hooks/use-toast";
import { suggestedFilename } from "@/lib/download-file";
import { buildResumePlainText } from "@/utils/plainTextExport";
import type { ExportFormat, PageLayout } from "@/types/export";

export function DownloadDialog({
  open,
  onClose,
  onDownloaded,
}: {
  open: boolean;
  onClose: () => void;
  onDownloaded: (filename: string) => void;
}) {
  const { resume, resumes, activeResumeId } = useResume();
  const { download, isDownloading, error } = useDownload();
  const { showToast } = useToast();

  const activeResumeName = resumes.find((r) => r.id === activeResumeId)?.name ?? "My Resume";

  const [filename, setFilename] = useState(() => suggestedFilename(activeResumeName));
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [layout, setLayout] = useState<PageLayout>("one");
  const [justCopied, setJustCopied] = useState(false);

  // Re-derive the suggested filename every time the dialog OPENS, so it
  // always reflects the resume's current name in the multi-resume
  // switcher at the moment you actually look at it -- re-deriving on
  // close (the previous approach) left the very first open after a
  // rename still showing the stale name, since that's before any close
  // had happened to trigger the refresh.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFilename(suggestedFilename(activeResumeName));
  }

  const handleDownload = async () => {
    const ok = await download({ filename, format, layout });
    if (ok) onDownloaded(`${filename.trim() || "Resume"}.${format}`);
  };

  const handleCopyText = async () => {
    const text = buildResumePlainText(resume);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable or permission denied (e.g. an older
      // browser, or a non-HTTPS context) -- fall back to the classic
      // selection-based copy, which works without any special permission.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        showToast("Couldn't copy automatically -- please select and copy manually.", "error");
        document.body.removeChild(textarea);
        return;
      }
      document.body.removeChild(textarea);
    }
    setJustCopied(true);
    showToast("Resume copied as plain text", "success");
    setTimeout(() => setJustCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Download Resume">
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">Download Resume</h2>
      <p className="mb-6 text-sm text-foreground-secondary">
        Choose a filename and format for your resume.
      </p>

      <div className="flex flex-col gap-5">
        <Input
          label="Filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          hint={`Will be saved as "${filename.trim() || "Resume"}.${format}"`}
        />

        <SegmentedControl
          label="Format"
          value={format}
          onChange={setFormat}
          options={[
            { value: "pdf", label: "PDF" },
            { value: "docx", label: "DOCX" },
          ]}
        />

        <SegmentedControl
          label="Pages"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "one", label: "One Page" },
            { value: "two", label: "Two Pages" },
          ]}
        />

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          <Button variant="ghost" size="sm" onClick={handleCopyText}>
            {justCopied ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              <>
                <ClipboardCopy size={14} /> Copy as Text
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={isDownloading}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download size={15} /> Download
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
