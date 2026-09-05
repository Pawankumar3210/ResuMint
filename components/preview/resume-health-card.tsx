"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useResumeHealth } from "@/hooks/use-resume-health";
import { cn } from "@/lib/utils";

export function ResumeHealthCard() {
  const { score, checks } = useResumeHealth();

  return (
    <div className="glass-surface rounded-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Resume Health</h3>
        <span
          className={cn(
            "rounded-chip px-2.5 py-1 text-xs font-medium tabular-nums",
            score >= 80
              ? "bg-success/15 text-success"
              : score >= 50
                ? "bg-warning/15 text-warning"
                : "bg-error/15 text-error"
          )}
        >
          {score}/100
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-xs">
            {check.status === "pass" ? (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
            ) : (
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            )}
            <span className="text-foreground-secondary">
              {check.status === "pass" ? check.label : check.suggestion ?? check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
