"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ListFilter,
  ScanSearch,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import { useAppActions } from "@/hooks/use-app-actions";
import { useAtsAnalysis } from "@/hooks/use-ats-analysis";
import { useAtsCheckpoints } from "@/hooks/use-ats-checkpoints";
import { useResume } from "@/hooks/use-resume";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";
import { downloadBlob, suggestedFilename } from "@/lib/download-file";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { AtsKeyword, AtsSection } from "@/types/ats";
import { checkpointMatchesJob, createAtsCheckpoint } from "@/utils/ats/checkpoint";
import { canAddKeywordToSkills, skillCategoryForKeyword } from "@/utils/ats/keyword-actions";
import { buildAtsReportText } from "@/utils/ats/report";
import { cn } from "@/lib/utils";
import { AtsKeywordList } from "./ats-keyword-list";
import { AtsOverviewPanel } from "./ats-overview-panel";
import { AtsReadinessPanel } from "./ats-readiness-panel";
import { AtsTextPreview } from "./ats-text-preview";

type AtsTab = "overview" | "keywords" | "readiness" | "text";

export function AtsInsightsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { resume, resumes, activeResumeId, addSkill, undo } = useResume();
  const { checkpoint, saveCheckpoint, clearCheckpoint } =
    useAtsCheckpoints(activeResumeId);
  const getActions = useAppActions();
  const { showToast } = useToast();

  const {
    jobDescription,
    submittedJobDescription,
    setJobDescription,
    analysis,
    analyze,
    clear,
    error,
    isStale,
    minJobDescriptionLength,
  } = useAtsAnalysis(resume, open);

  const [activeTab, setActiveTab] = useState<AtsTab>("overview");
  const resultsRef = useRef<HTMLDivElement>(null);

  const resumeName =
    resumes.find((saved) => saved.id === activeResumeId)?.name ?? "My Resume";
  const checkpointMatchesCurrentJob = Boolean(
    checkpoint &&
      submittedJobDescription &&
      checkpointMatchesJob(checkpoint, submittedJobDescription)
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleAnalyze = () => {
    const ok = analyze();
    if (!ok) return;

    setActiveTab("overview");
    window.setTimeout(() => {
      if (window.innerWidth < 1024) {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 80);
  };

  const handleClear = () => {
    clear();
    setActiveTab("overview");
  };

  const handleJumpToSection = useCallback(
    (section: AtsSection) => {
      onClose();
      window.setTimeout(() => {
        getActions().jumpToSection?.(section);
      }, 180);
    },
    [getActions, onClose]
  );

  const canAddSkill = useCallback(
    (keyword: AtsKeyword) => canAddKeywordToSkills(keyword, resume),
    [resume]
  );

  const handleAddSkill = useCallback(
    (keyword: AtsKeyword) => {
      if (!canAddKeywordToSkills(keyword, resume)) return false;
      const category = skillCategoryForKeyword(keyword.category);
      if (!category) return false;

      addSkill(keyword.label, category);
      return true;
    },
    [addSkill, resume]
  );

  const handleUndoAddSkill = useCallback(() => {
    undo();
  }, [undo]);

  const handleSaveCheckpoint = useCallback(() => {
    if (!analysis || !submittedJobDescription) return;
    saveCheckpoint(createAtsCheckpoint(analysis, submittedJobDescription));
    showToast("Checkpoint saved. Make changes, then compare your progress.", "success");
  }, [analysis, saveCheckpoint, showToast, submittedJobDescription]);

  const handleClearCheckpoint = useCallback(() => {
    clearCheckpoint();
    showToast("Checkpoint cleared");
  }, [clearCheckpoint, showToast]);

  const buildCurrentReport = useCallback(() => {
    if (!analysis || !submittedJobDescription) return null;

    return buildAtsReportText({
      analysis,
      resumeName,
      candidateName: resume.personal.fullName.trim() || undefined,
      checkpoint,
      checkpointMatchesJob: checkpointMatchesCurrentJob,
    });
  }, [
    analysis,
    checkpoint,
    checkpointMatchesCurrentJob,
    resume.personal.fullName,
    resumeName,
    submittedJobDescription,
  ]);

  const handleExportReport = useCallback(() => {
    const report = buildCurrentReport();
    if (!report) return;

    downloadBlob(
      new Blob([report], { type: "text/plain;charset=utf-8" }),
      `${suggestedFilename(resumeName)}_ATS_Report.txt`
    );
    showToast("ATS report downloaded", "success");
  }, [buildCurrentReport, resumeName, showToast]);

  const handleCopyReport = useCallback(async () => {
    const report = buildCurrentReport();
    if (!report) return;

    const copied = await copyText(report);
    showToast(
      copied ? "ATS report copied" : "Couldn't copy the report. Try downloading it instead.",
      copied ? "success" : "error"
    );
  }, [buildCurrentReport, showToast]);

  const tabs: { id: AtsTab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "keywords", label: "Keywords", count: analysis?.keywords.length },
    { id: "readiness", label: "ATS Checks" },
    { id: "text", label: "Plain Text" },
  ];

  const currentWords = jobDescription.trim()
    ? jobDescription.trim().split(/\s+/).length
    : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="ATS Insights"
      unstyled
      hideCloseButton
      className="flex h-[min(92vh,980px)] max-w-6xl flex-col overflow-hidden rounded-dialog border border-glass-border bg-popover p-0 text-popover-foreground shadow-2xl"
    >
      <header className="relative flex shrink-0 items-center gap-3 border-b border-glass-border px-4 py-3 pr-14 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-primary/10 text-primary">
          <ScanSearch size={17} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">ATS Insights</h2>
            <span className="hidden items-center gap-1 rounded-chip border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success sm:inline-flex">
              <ShieldCheck size={10} />
              Local only
            </span>
          </div>
          <p className="truncate text-[11px] text-foreground-secondary">
            {analysis?.roleTitle
              ? `Tailoring for ${analysis.roleTitle}`
              : "Compare your resume with a pasted job description — privately in your browser."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close ATS Insights"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-button text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground sm:right-4"
        >
          <X size={16} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start">
          <section className="rounded-card border border-glass-border bg-muted/20 p-4 lg:sticky lg:top-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Job description</h3>
              <span className="text-[11px] tabular-nums text-foreground-secondary">
                {currentWords} words
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">
              Paste the role&apos;s requirements, responsibilities, or skills section. The more
              complete the text, the better the priority detection.
            </p>

            <label htmlFor="ats-job-description" className="sr-only">
              Job description
            </label>
            <textarea
              id="ats-job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description here…"
              className="mt-3 min-h-[230px] w-full resize-y rounded-input border border-glass-border bg-transparent px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-foreground-secondary/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />

            <div className="mt-1.5 flex items-start justify-between gap-2">
              <p className="text-[10px] text-foreground-secondary">
                Minimum {minJobDescriptionLength} characters
              </p>
              <p className="text-[10px] tabular-nums text-foreground-secondary">
                {jobDescription.trim().length} characters
              </p>
            </div>

            {error && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-error">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            {isStale && !error && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-warning">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                The job description changed. Analyze again to update the results.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleAnalyze}
                disabled={jobDescription.trim().length === 0}
                className="flex-1"
              >
                <ScanSearch size={14} />
                {analysis ? "Re-analyze" : "Analyze match"}
              </Button>
              {(jobDescription.length > 0 || analysis) && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2 border-t border-glass-border pt-3">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-success" />
              <p className="text-[10px] leading-relaxed text-foreground-secondary">
                Your resume and the job description stay in this browser. No uploads, no account,
                and no AI-generated claims.
              </p>
            </div>
          </section>

          <div ref={resultsRef} className="min-w-0">
            {!analysis ? (
              <div className="rounded-card border border-dashed border-glass-border bg-muted/10 p-5 sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary/10 text-primary">
                  <Target size={20} />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground">
                  See what the job asks for — and what your resume proves.
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground-secondary">
                  Paste a job description to get two separate signals: how well your resume
                  matches the role, and whether the resume is structurally easy for an ATS to
                  read.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-input border border-glass-border bg-popover/60 p-3">
                    <Target size={15} className="text-primary" />
                    <p className="mt-2 text-xs font-semibold text-foreground">Job Match</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">
                      Weighted coverage of must-have, preferred, and other keywords.
                    </p>
                  </div>
                  <div className="rounded-input border border-glass-border bg-popover/60 p-3">
                    <ListFilter size={15} className="text-primary" />
                    <p className="mt-2 text-xs font-semibold text-foreground">Keyword evidence</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">
                      See exactly where each term appears, or whether it is missing.
                    </p>
                  </div>
                  <div className="rounded-input border border-glass-border bg-popover/60 p-3">
                    <ShieldCheck size={15} className="text-primary" />
                    <p className="mt-2 text-xs font-semibold text-foreground">ATS Readiness</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">
                      Separate checks for contact info, dates, layout, and resume hygiene.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-2 rounded-input border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-[11px] leading-relaxed text-foreground-secondary">
                    Analysis is deterministic and local. It never edits your resume or invents
                    experience for you.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Analysis ready
                    </p>
                    <h3 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-foreground">
                      {analysis.roleTitle ?? "Job match snapshot"}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-foreground-secondary">
                      {analysis.jdWordCount} job-description words · {analysis.keywords.length}{" "}
                      keywords extracted
                    </p>
                  </div>
                  <span className="rounded-chip border border-glass-border px-2.5 py-1 text-[10px] text-foreground-secondary">
                    Re-runs automatically if your resume changes
                  </span>
                </div>

                <div
                  role="tablist"
                  aria-label="ATS Insights sections"
                  className="flex overflow-x-auto rounded-input border border-glass-border bg-muted/40 p-1"
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        id={`ats-tab-${tab.id}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`ats-panel-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "relative shrink-0 rounded-button px-3 py-1.5 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-foreground-secondary hover:text-foreground"
                        )}
                      >
                        {tab.label}
                        {typeof tab.count === "number" && (
                          <span
                            className={cn(
                              "ml-1 tabular-nums",
                              isActive ? "text-primary-foreground/75" : "text-foreground-secondary"
                            )}
                          >
                            ({tab.count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div
                  id={`ats-panel-${activeTab}`}
                  role="tabpanel"
                  aria-labelledby={`ats-tab-${activeTab}`}
                >
                  {activeTab === "overview" && (
                    <AtsOverviewPanel
                      analysis={analysis}
                      checkpoint={checkpoint}
                      checkpointMatchesJob={checkpointMatchesCurrentJob}
                      canAddSkill={canAddSkill}
                      onAddSkill={handleAddSkill}
                      onUndoAddSkill={handleUndoAddSkill}
                      onJumpToSection={handleJumpToSection}
                      onSaveCheckpoint={handleSaveCheckpoint}
                      onClearCheckpoint={handleClearCheckpoint}
                      onExportReport={handleExportReport}
                      onCopyReport={handleCopyReport}
                    />
                  )}
                  {activeTab === "keywords" && (
                    <AtsKeywordList keywords={analysis.keywords} />
                  )}
                  {activeTab === "readiness" && (
                    <AtsReadinessPanel
                      checks={analysis.readiness}
                      score={analysis.scores.readiness}
                    />
                  )}
                  {activeTab === "text" && <AtsTextPreview resume={resume} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-glass-border px-4 py-2.5 text-[10px] text-foreground-secondary sm:px-5">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={11} className="text-success" />
          Private, local analysis
        </span>
        <span>No AI · No uploads · Not a guarantee of ATS results</span>
      </footer>
    </Dialog>
  );
}
