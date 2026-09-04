"use client";

import { useRef } from "react";
import { Upload, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useImportResume } from "@/hooks/use-import-resume";
import { useToast } from "@/hooks/use-toast";
import { SECTION_META } from "@/constants/resume-defaults";
import type { SectionId } from "@/types/resume";

const PREVIEWABLE_SECTIONS: { id: SectionId; count: (r: NonNullable<ReturnType<typeof useImportResume>["result"]>) => number }[] = [
  { id: "personal", count: (r) => (r.summary.detectedName || r.summary.detectedEmail ? 1 : 0) },
  { id: "summary", count: (r) => (r.data.summary?.text ? 1 : 0) },
  { id: "education", count: (r) => r.summary.educationCount },
  { id: "experience", count: (r) => r.summary.experienceCount },
  { id: "projects", count: (r) => r.summary.projectCount },
  { id: "skills", count: (r) => r.summary.skillCount },
  { id: "certifications", count: (r) => r.summary.certificationCount },
  { id: "achievements", count: (r) => r.data.achievements?.length ?? 0 },
  { id: "languages", count: (r) => r.data.languages?.length ?? 0 },
];

export function ImportResumeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { stage, result, selection, errorMessage, handleFile, toggleSelection, confirmImport, reset, isSectionEmpty } =
    useImportResume();
  const { showToast } = useToast();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = () => {
    confirmImport();
    showToast("Resume Imported", "success");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Import Resume">
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">Import Resume</h2>
      <p className="mb-6 text-sm text-foreground-secondary">
        Upload an existing PDF or DOCX resume. We&apos;ll pull out what we can find -- you
        choose what to bring in before anything changes.
      </p>

      {stage === "idle" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-input border border-dashed border-glass-border px-6 py-10 text-center transition-colors hover:border-primary/50"
        >
          <Upload size={24} className="text-foreground-secondary" />
          <p className="text-sm text-foreground">Click to upload, or drag a file here</p>
          <p className="text-xs text-foreground-secondary">PDF or DOCX</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {stage === "parsing" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 size={24} className="animate-spin text-primary" />
          <p className="text-sm text-foreground-secondary">Reading your resume...</p>
        </div>
      )}

      {stage === "error" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FileText size={24} className="text-error" />
          <p className="text-sm text-error">{errorMessage}</p>
          <Button variant="secondary" size="sm" onClick={reset}>
            Try Another File
          </Button>
        </div>
      )}

      {stage === "preview" && result && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-foreground-secondary">
            Here&apos;s what we found. Only checked items will be imported --
            sections that already have your content are left unchecked by default.
          </p>

          <ul className="flex flex-col gap-2">
            {PREVIEWABLE_SECTIONS.filter((s) => s.count(result) > 0).map(({ id, count }) => {
              const willReplace = !isSectionEmpty(id);
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-input border border-glass-border bg-muted/40 px-3.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={!!selection[id]}
                      onChange={() => toggleSelection(id)}
                      className="h-4 w-4 rounded accent-primary"
                    />
                    <span className="flex-1 text-sm text-foreground">
                      {SECTION_META[id].label}
                      <span className="ml-1.5 text-xs text-foreground-secondary">
                        ({count(result)} found)
                      </span>
                    </span>
                    {willReplace && selection[id] && (
                      <span className="text-xs font-medium text-warning">will replace</span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          {PREVIEWABLE_SECTIONS.every((s) => s.count(result) === 0) && (
            <p className="flex items-center gap-2 rounded-input border border-glass-border bg-muted/40 px-3.5 py-3 text-sm text-foreground-secondary">
              <CheckCircle2 size={15} /> We couldn&apos;t confidently detect any fields in this file.
              You can still fill things in manually.
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!Object.values(selection).some(Boolean)}
            >
              Confirm Import
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
