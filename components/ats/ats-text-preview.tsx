"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import type { Resume } from "@/types/resume";
import { buildResumePlainText } from "@/utils/plainTextExport";

export function AtsTextPreview({ resume }: { resume: Resume }) {
  const text = useMemo(() => buildResumePlainText(resume), [resume]);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const lines = text.split("\n");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const headings = lines.filter((line) => /^-{2,}$/.test(line.trim())).length;
  const hasContact =
    resume.personal.email.trim().length > 0 ||
    resume.personal.phone.trim().length > 0;

  const handleCopy = async () => {
    const ok = await copyText(text);
    if (!ok) return;

    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="ats-stagger space-y-4">
      <section className="ats-card rounded-card border border-glass-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <FileText size={14} className="text-primary" />
              Plain-text view
            </div>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-foreground-secondary">
              This is close to what a simple ATS parser can read. It keeps your content and
              reading order, but removes columns, colors, and other visual styling.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy text"}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-foreground-secondary">
          <span className="rounded-chip border border-glass-border bg-popover/60 px-2 py-1 tabular-nums">
            {words} words
          </span>
          <span className="rounded-chip border border-glass-border bg-popover/60 px-2 py-1 tabular-nums">
            {lines.length} lines
          </span>
          <span className="rounded-chip border border-glass-border bg-popover/60 px-2 py-1 tabular-nums">
            {headings} headings
          </span>
          <span className="rounded-chip border border-glass-border bg-popover/60 px-2 py-1">
            {hasContact ? "Contact block detected" : "No contact block detected"}
          </span>
        </div>

        {resume.template === "modern" && (
          <div className="mt-3 flex items-start gap-2 rounded-input border border-warning/25 bg-warning/10 px-3 py-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-[11px] leading-relaxed text-foreground-secondary">
              Your resume uses the Modern two-column layout. If a portal garbles the file,
              export the Classic layout instead.
            </p>
          </div>
        )}
      </section>

      <section className="ats-card overflow-hidden rounded-card border border-glass-border bg-popover/60">
        <div className="flex items-center justify-between gap-2 border-b border-glass-border px-3.5 py-2.5">
          <span className="text-[11px] font-medium text-foreground">Parser-style preview</span>
          <span className="flex items-center gap-1 text-[10px] text-success">
            <ShieldCheck size={10} />
            Stays in your browser
          </span>
        </div>
        <pre className="max-h-[52vh] min-h-[320px] overflow-auto whitespace-pre-wrap break-words px-4 py-4 font-mono text-[11px] leading-relaxed text-foreground-secondary">
          {text}
        </pre>
      </section>

      <p className="text-[11px] leading-relaxed text-foreground-secondary">
        ATS parsing varies by vendor. This preview checks readability — it cannot guarantee how
        a specific system will interpret your file.
      </p>
    </div>
  );
}
