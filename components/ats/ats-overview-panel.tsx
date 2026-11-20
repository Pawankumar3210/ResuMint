"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Lightbulb,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { AtsAnalysis, AtsKeyword, AtsSuggestion } from "@/types/ats";
import { cn } from "@/lib/utils";
import { AtsScoreRing, scoreLabel, scoreTextClass } from "./ats-score-ring";

const CARD_CLASS = "rounded-card border border-glass-border bg-muted/20 p-4";

function coverageText(keyword: AtsKeyword): string {
  if (keyword.coverage === "skills") return "Skills list only";
  if (keyword.coverage === "supporting") return "Supporting sections";
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

export function AtsOverviewPanel({ analysis }: { analysis: AtsAnalysis }) {
  const { scores, priority, keywords, suggestions } = analysis;
  const criticalKeywords = keywords.filter((keyword) => keyword.priority === "critical");
  const weakCritical = criticalKeywords.filter(
    (keyword) => keyword.coverage !== "strong"
  );

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
              {weakCritical.slice(0, 5).map((keyword) => (
                <li
                  key={keyword.id}
                  className="flex items-start gap-2.5 rounded-input border border-glass-border bg-popover/60 px-3 py-2.5"
                >
                  {keyword.coverage === "none" ? (
                    <XCircle size={15} className="mt-0.5 shrink-0 text-error" />
                  ) : (
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{keyword.label}</p>
                    <p className="mt-0.5 text-[11px] text-foreground-secondary">
                      {coverageText(keyword)}
                    </p>
                  </div>
                </li>
              ))}
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
