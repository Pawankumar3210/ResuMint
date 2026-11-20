"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function scoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

export function scoreTextClass(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-error";
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--primary)";
  if (score >= 40) return "var(--warning)";
  return "var(--error)";
}

export function AtsScoreRing({
  score,
  label,
  icon,
  size = "md",
}: {
  score: number;
  label: string;
  icon?: ReactNode;
  size?: "sm" | "md";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const dimension = size === "sm" ? "h-16 w-16" : "h-24 w-24";

  return (
    <div
      className={cn("relative shrink-0 rounded-full p-[5px]", dimension)}
      style={{
        background: `conic-gradient(${scoreColor(clamped)} ${clamped * 3.6}deg, color-mix(in srgb, var(--foreground) 10%, transparent) 0deg)`,
      }}
      role="img"
      aria-label={`${label}: ${clamped} out of 100`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-popover">
        {icon && <span className="mb-0.5 text-foreground-secondary">{icon}</span>}
        <span
          className={cn(
            "font-display font-bold tabular-nums leading-none",
            size === "sm" ? "text-lg" : "text-2xl",
            scoreTextClass(clamped)
          )}
        >
          {clamped}
        </span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-foreground-secondary">
          / 100
        </span>
      </div>
    </div>
  );
}
