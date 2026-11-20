"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { AtsReadinessCheck, AtsReadinessStatus } from "@/types/ats";
import { cn } from "@/lib/utils";
import { scoreTextClass } from "./ats-score-ring";

const STATUS_LABELS: Record<AtsReadinessStatus, string> = {
  pass: "Pass",
  warning: "Review",
  fail: "Fix",
};

const STATUS_CLASSES: Record<AtsReadinessStatus, string> = {
  pass: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  fail: "border-error/25 bg-error/10 text-error",
};

function StatusIcon({ status }: { status: AtsReadinessStatus }) {
  if (status === "pass") {
    return <CheckCircle2 size={15} className="text-success" aria-label="Pass" />;
  }
  if (status === "warning") {
    return <AlertTriangle size={15} className="text-warning" aria-label="Review" />;
  }
  return <XCircle size={15} className="text-error" aria-label="Fix" />;
}

export function AtsReadinessPanel({
  checks,
  score,
}: {
  checks: AtsReadinessCheck[];
  score: number;
}) {
  const passed = checks.filter((check) => check.status === "pass").length;

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-glass-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">ATS Readiness</h3>
            <p className="mt-0.5 text-xs text-foreground-secondary">
              Parser-friendly structure and resume hygiene. This is separate from Job Match.
            </p>
          </div>
          <div className="text-right">
            <span className={cn("font-display text-2xl font-bold tabular-nums", scoreTextClass(score))}>
              {score}
            </span>
            <span className="text-xs text-foreground-secondary"> / 100</span>
            <p className="text-[10px] text-foreground-secondary">
              {passed} of {checks.length} checks passing
            </p>
          </div>
        </div>
        <ProgressBar value={score} className="mt-3" />
      </div>

      <ul className="overflow-hidden rounded-card border border-glass-border">
        {checks.map((check) => (
          <li key={check.id} className="border-b border-glass-border last:border-b-0">
            <div className="flex items-start gap-3 px-3.5 py-3 sm:px-4">
              <span className="mt-0.5 shrink-0">
                <StatusIcon status={check.status} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{check.label}</span>
                  <span
                    className={cn(
                      "rounded-chip border px-1.5 py-0.5 text-[10px] font-medium",
                      STATUS_CLASSES[check.status]
                    )}
                  >
                    {STATUS_LABELS[check.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">
                  {check.detail}
                </p>
                {check.suggestion && (
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                    {check.suggestion}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[11px] leading-relaxed text-foreground-secondary">
        ATS software varies by employer. Treat this checklist as guidance, not a guarantee of
        passing any specific system.
      </p>
    </div>
  );
}
