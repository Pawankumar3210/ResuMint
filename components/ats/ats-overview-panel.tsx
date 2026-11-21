"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookmarkPlus,
  CheckCircle2,
  Copy,
  Download,
  Gauge,
  GraduationCap,
  Info,
  Lightbulb,
  Minus,
  ShieldCheck,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import type {
  AtsAnalysis,
  AtsCheckpoint,
  AtsKeyword,
  AtsRequirementCheck,
  AtsSection,
  AtsSuggestion,
} from "@/types/ats";
import { cn } from "@/lib/utils";
import { AtsScoreRing, scoreLabel, scoreTextClass } from "./ats-score-ring";

const CARD_CLASS = "rounded-card border border-glass-border bg-muted/20 p-4";

function coverageText(keyword: AtsKeyword): string {
  if (keyword.coverage === "skills") return "Skills list only";
  if (keyword.coverage === "supporting") return "Supporting sections only";
  return "Not found";
}

function suggestionToneClass(tone: AtsSuggestion["tone"]): string {
  if (tone === "critical") return "text-error";
  if (tone === "improve") return "text-warning";
  return "text-primary";
}

function SuggestionIcon({ tone }: { tone: AtsSuggestion["tone"] }) {
  if (tone === "critical") return <XCircle size={15} className="text-error" />;
  if (tone === "improve") return <AlertTriangle size={15} className="text-warning" />;
  return <Lightbulb size={15} className="text-primary" />;
}

function RequirementIcon({ check }: { check: AtsRequirementCheck }) {
  if (check.status === "pass") {
    return <CheckCircle2 size={15} className="text-success" />;
  }
  if (check.status === "warning") {
    return <AlertTriangle size={15} className="text-warning" />;
  }
  if (check.status === "fail") {
    return <XCircle size={15} className="text-error" />;
  }
  return <Info size={15} className="text-primary" />;
}

function requirementIconForId(id: string) {
  if (id === "experience-years") return Gauge;
  if (id === "education-degree") return GraduationCap;
  return Award;
}

function gapTargetSection(
  keyword: AtsKeyword,
  canAdd: boolean
): AtsSection {
  if (keyword.coverage === "skills") return "experience";
  if (canAdd) return "skills";
  return keyword.locations[0]?.section ?? "experience";
}

function sectionLabel(section: AtsSection): string {
  if (section === "experience") return "Open Experience";
  if (section === "skills") return "Open Skills";
  if (section === "summary") return "Open Summary";
  if (section === "projects") return "Open Projects";
  if (section === "education") return "Open Education";
  if (section === "certifications") return "Open Certifications";
  if (section === "achievements") return "Open Achievements";
  if (section === "languages") return "Open Languages";
  return "Open section";
}

function formatCheckpointDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function deltaTone(value: number, goodWhenPositive: boolean): string {
  if (value === 0) return "text-foreground-secondary";
  const isGood = goodWhenPositive ? value > 0 : value < 0;
  return isGood ? "text-success" : "text-error";
}

function Delta({ value, goodWhenPositive }: { value: number; goodWhenPositive: boolean }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-foreground-secondary">
        <Minus size={11} />
        0
      </span>
    );
  }

  const Icon = value > 0 ? TrendingUp : TrendingDown;

  return (
    <span className={cn("inline-flex items-center gap-0.5", deltaTone(value, goodWhenPositive))}>
      <Icon size={11} />
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

interface AtsOverviewPanelProps {
  analysis: AtsAnalysis;
  checkpoint?: AtsCheckpoint;
  checkpointMatchesJob: boolean;
  canAddSkill: (keyword: AtsKeyword) => boolean;
  onAddSkill: (keyword: AtsKeyword) => boolean;
  onUndoAddSkill: () => void;
  onJumpToSection: (section: AtsSection) => void;
  onSaveCheckpoint: () => void;
  onClearCheckpoint: () => void;
  onExportReport: () => void;
  onCopyReport: () => void;
}

export function AtsOverviewPanel({
  analysis,
  checkpoint,
  checkpointMatchesJob,
  canAddSkill,
  onAddSkill,
  onUndoAddSkill,
  onJumpToSection,
  onSaveCheckpoint,
  onClearCheckpoint,
  onExportReport,
  onCopyReport,
}: AtsOverviewPanelProps) {
  const { scores, priority, keywords, suggestions } = analysis;
  const criticalKeywords = keywords.filter((keyword) => keyword.priority === "critical");
  const weakCritical = criticalKeywords.filter(
    (keyword) => keyword.coverage !== "strong"
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const priorityRows = [
    {
      id: "critical" as const,
      label: "Must-have",
      data: priority.critical,
      barClass: "bg-error",
    },
    {
      id: "preferred" as const,
      label: "Preferred",
      data: priority.preferred,
      barClass: "bg-warning",
    },
    {
      id: "standard" as const,
      label: "Other",
      data: priority.standard,
      barClass: "bg-primary",
    },
  ];

  const currentMissingCount = criticalKeywords.filter(
    (keyword) => keyword.coverage === "none"
  ).length;
  const previousMissingCount = checkpoint?.missingCritical.length ?? 0;
  const missingChange = checkpointMatchesJob
    ? currentMissingCount - previousMissingCount
    : 0;

  const handleConfirmAdd = (keyword: AtsKeyword) => {
    const added = onAddSkill(keyword);
    setConfirmingId(null);
    if (added) setLastAdded(keyword.label);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Target size={13} className="text-primary" />
                Job Match
              </div>
              <p className="mt-1 text-[11px] leading-snug text-foreground-secondary">
                Weighted keyword coverage
              </p>
            </div>
            <AtsScoreRing score={scores.jobMatch} label="Job Match" size="sm" />
          </div>
          <p className={cn("mt-3 text-xs font-semibold", scoreTextClass(scores.jobMatch))}>
            {scoreLabel(scores.jobMatch)}
            <span className="ml-1 font-normal text-foreground-secondary">
              · {scores.matchedKeywords} of {scores.totalKeywords} keywords
            </span>
          </p>
        </div>

        <div className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck size={13} className="text-primary" />
                ATS Readiness
              </div>
              <p className="mt-1 text-[11px] leading-snug text-foreground-secondary">
                Separate parser & content checks
              </p>
            </div>
            <AtsScoreRing score={scores.readiness} label="ATS Readiness" size="sm" />
          </div>
          <p className={cn("mt-3 text-xs font-semibold", scoreTextClass(scores.readiness))}>
            {scoreLabel(scores.readiness)}
            <span className="ml-1 font-normal text-foreground-secondary">
              · {analysis.readiness.filter((check) => check.status === "pass").length} of{" "}
              {analysis.readiness.length} checks passing
            </span>
          </p>
        </div>

        <div className={cn(CARD_CLASS, "sm:col-span-2")}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Gauge size={13} className="text-primary" />
                Must-have coverage
              </div>
              <p className="mt-1 text-[11px] leading-snug text-foreground-secondary">
                Critical terms found
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "font-display text-2xl font-bold tabular-nums leading-none",
                  scores.criticalTotal > 0
                    ? scoreTextClass(scores.criticalCoverage)
                    : "text-foreground-secondary"
                )}
              >
                {scores.criticalTotal > 0
                  ? `${scores.criticalMatched}/${scores.criticalTotal}`
                  : "—"}
              </p>
              <p className="mt-1 text-[10px] text-foreground-secondary">
                {scores.criticalTotal > 0
                  ? `${scores.criticalCoverage}% covered`
                  : "No must-haves detected"}
              </p>
            </div>
          </div>
          <ProgressBar value={scores.criticalCoverage} className="mt-4 h-1.5" />
          <p className="mt-2 text-[11px] text-foreground-secondary">
            {scores.strongEvidence} keyword{scores.strongEvidence === 1 ? "" : "s"} backed by
            experience or projects
          </p>
        </div>
      </div>

      {analysis.requirements.length > 0 && (
        <section className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-foreground">Job requirements</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-foreground-secondary">
            Clear requirements found in the job description, checked against your resume.
          </p>
          <ul className="mt-3 space-y-2">
            {analysis.requirements.map((check) => {
              const RequirementHeadingIcon = requirementIconForId(check.id);
              return (
                <li
                  key={check.id}
                  className="flex items-start gap-2.5 rounded-input border border-glass-border bg-popover/60 px-3 py-2.5"
                >
                  <span className="mt-0.5 shrink-0">
                    <RequirementIcon check={check} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <RequirementHeadingIcon size={12} className="text-foreground-secondary" />
                      {check.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-secondary">
                      {check.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className={CARD_CLASS}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Must-have gaps</h3>
            <span className="text-[11px] text-foreground-secondary">
              {weakCritical.length > 5
                ? `Showing 5 of ${weakCritical.length}`
                : `${weakCritical.length} to review`}
            </span>
          </div>

          {lastAdded && (
            <div className="mt-3 flex items-center gap-2 rounded-input border border-success/25 bg-success/10 px-3 py-2">
              <CheckCircle2 size={14} className="shrink-0 text-success" />
              <p className="flex-1 text-[11px] text-foreground">
                Added <span className="font-semibold">{lastAdded}</span> to Skills.
              </p>
              <button
                type="button"
                onClick={() => {
                  onUndoAddSkill();
                  setLastAdded(null);
                }}
                className="text-[11px] font-semibold text-success underline-offset-2 hover:underline"
              >
                Undo
              </button>
            </div>
          )}

          {criticalKeywords.length === 0 ? (
            <p className="mt-3 rounded-input border border-glass-border bg-popover/60 px-3 py-2.5 text-xs leading-relaxed text-foreground-secondary">
              No explicit must-have terms were detected. Check the Keywords tab and confirm the
              job description had a requirements or skills section.
            </p>
          ) : weakCritical.length === 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-input border border-success/25 bg-success/10 px-3 py-2.5">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />
              <p className="text-xs leading-relaxed text-foreground">
                Every must-have term has contextual evidence in your experience or projects.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {weakCritical.slice(0, 5).map((keyword) => {
                const canAdd = canAddSkill(keyword);
                const target = gapTargetSection(keyword, canAdd);
                const isConfirming = confirmingId === keyword.id;

                return (
                  <li
                    key={keyword.id}
                    className="rounded-input border border-glass-border bg-popover/60 px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      {keyword.coverage === "none" ? (
                        <XCircle size={15} className="mt-0.5 shrink-0 text-error" />
                      ) : (
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">{keyword.label}</p>
                        <p className="mt-0.5 text-[11px] text-foreground-secondary">
                          {coverageText(keyword)}
                        </p>
                        {keyword.relatedSkills && keyword.relatedSkills.length > 0 && (
                          <p className="mt-1 text-[11px] leading-relaxed text-primary">
                            Related in your resume: {keyword.relatedSkills.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {canAdd && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmingId(isConfirming ? null : keyword.id)}
                          aria-expanded={isConfirming}
                        >
                          Add to Skills
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onJumpToSection(target)}
                      >
                        {sectionLabel(target)}
                        <ArrowRight size={12} />
                      </Button>
                    </div>

                    {isConfirming && (
                      <div className="mt-2 rounded-input border border-primary/25 bg-primary/5 px-3 py-2.5">
                        <p className="text-[11px] leading-relaxed text-foreground-secondary">
                          Add <span className="font-semibold text-foreground">{keyword.label}</span>{" "}
                          to your Skills list? Only confirm if you can genuinely discuss it.
                          This can be undone.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => handleConfirmAdd(keyword)}>
                            Add skill
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-foreground">Priority mix</h3>
          <div className="mt-3 space-y-3">
            {priorityRows.map((row) => {
              const percent = row.data.total
                ? Math.round((row.data.matched / row.data.total) * 100)
                : 0;
              return (
                <div key={row.id}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium text-foreground">{row.label}</span>
                    <span className="tabular-nums text-foreground-secondary">
                      {row.data.matched}/{row.data.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-chip bg-muted">
                    <div
                      className={cn("h-full rounded-chip transition-[width] duration-500", row.barClass)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-foreground-secondary">
            Must-have terms come from requirements, qualifications, or skills sections. Preferred
            terms come from nice-to-have wording.
          </p>
        </section>
      </div>

      <section className={CARD_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Checkpoint & report</h3>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-foreground-secondary">
              Save a local checkpoint before editing, then come back to see what improved. The
              report is plain text and never leaves your browser unless you download or copy it.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onSaveCheckpoint}>
            <BookmarkPlus size={13} />
            {checkpoint ? "Update checkpoint" : "Save checkpoint"}
          </Button>
        </div>

        {checkpoint && (
          <div className="mt-3 rounded-input border border-glass-border bg-popover/60 px-3 py-3">
            {!checkpointMatchesJob ? (
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                <p className="text-[11px] leading-relaxed text-foreground-secondary">
                  This checkpoint belongs to a different job description, so it is not compared.
                  Save a new checkpoint for this role.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] uppercase tracking-widest text-foreground-secondary">
                  Compared with {formatCheckpointDate(checkpoint.createdAt)}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-input bg-muted/40 px-2.5 py-2">
                    <p className="text-[10px] text-foreground-secondary">Job Match</p>
                    <p className="mt-0.5 flex items-baseline gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                      {scores.jobMatch}
                      <Delta
                        value={scores.jobMatch - checkpoint.jobMatch}
                        goodWhenPositive
                      />
                    </p>
                  </div>
                  <div className="rounded-input bg-muted/40 px-2.5 py-2">
                    <p className="text-[10px] text-foreground-secondary">ATS Readiness</p>
                    <p className="mt-0.5 flex items-baseline gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                      {scores.readiness}
                      <Delta
                        value={scores.readiness - checkpoint.readiness}
                        goodWhenPositive
                      />
                    </p>
                  </div>
                  <div className="rounded-input bg-muted/40 px-2.5 py-2">
                    <p className="text-[10px] text-foreground-secondary">Missing must-haves</p>
                    <p className="mt-0.5 flex items-baseline gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                      {currentMissingCount}
                      <Delta value={missingChange} goodWhenPositive={false} />
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-glass-border pt-3">
          <Button variant="secondary" size="sm" onClick={onExportReport}>
            <Download size={13} />
            Download report
          </Button>
          <Button variant="ghost" size="sm" onClick={onCopyReport}>
            <Copy size={13} />
            Copy report
          </Button>
          {checkpoint && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCheckpoint}
              className="ml-auto text-error hover:text-error"
            >
              <Trash2 size={13} />
              Clear checkpoint
            </Button>
          )}
        </div>
      </section>

      <section className={CARD_CLASS}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Recommended next steps</h3>
          <span className="text-[11px] text-foreground-secondary">
            {suggestions.length > 5
              ? `Top 5 of ${suggestions.length}`
              : `${suggestions.length} action${suggestions.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {suggestions.length === 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-foreground-secondary">
            No urgent changes were detected. Keep your examples specific, truthful, and easy to
            scan.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {suggestions.slice(0, 5).map((suggestion) => (
              <li key={suggestion.id} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">
                  <SuggestionIcon tone={suggestion.tone} />
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      suggestionToneClass(suggestion.tone)
                    )}
                  >
                    {suggestion.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground-secondary">
                    {suggestion.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] leading-relaxed text-foreground-secondary">
        Job Match is a deterministic estimate based on visible wording and prioritized job
        requirements. It does not predict a hiring decision or guarantee an ATS result.
      </p>
    </div>
  );
}
