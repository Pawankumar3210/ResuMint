"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Search,
  XCircle,
} from "lucide-react";
import { ATS_CATEGORY_LABELS } from "@/constants/ats-taxonomy";
import type { AtsKeyword, AtsPriority } from "@/types/ats";
import { cn } from "@/lib/utils";

type KeywordFilter = "all" | "critical" | "preferred" | "missing" | "skills";

const FILTERS: { value: KeywordFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Must-have" },
  { value: "preferred", label: "Preferred" },
  { value: "missing", label: "Missing" },
  { value: "skills", label: "Skills only" },
];

const PRIORITY_CLASSES: Record<AtsPriority, string> = {
  critical: "border-error/25 bg-error/10 text-error",
  preferred: "border-warning/25 bg-warning/10 text-warning",
  standard: "border-glass-border bg-muted/60 text-foreground-secondary",
};

const PRIORITY_LABELS: Record<AtsPriority, string> = {
  critical: "Must-have",
  preferred: "Preferred",
  standard: "Other",
};

function coverageLabel(keyword: AtsKeyword): string {
  if (keyword.coverage === "strong") return "Experience / projects";
  if (keyword.coverage === "supporting") return "Supporting sections";
  if (keyword.coverage === "skills") return "Skills only";
  return "Not found";
}

function KeywordStatusIcon({ keyword }: { keyword: AtsKeyword }) {
  if (keyword.coverage === "strong") {
    return <CheckCircle2 size={15} className="text-success" aria-label="Used in context" />;
  }
  if (keyword.coverage === "supporting") {
    return <CheckCircle2 size={15} className="text-primary" aria-label="Found in a supporting section" />;
  }
  if (keyword.coverage === "skills") {
    return <AlertTriangle size={15} className="text-warning" aria-label="Listed only as a skill" />;
  }
  return <XCircle size={15} className="text-error" aria-label="Missing" />;
}

function matchesFilter(keyword: AtsKeyword, filter: KeywordFilter): boolean {
  if (filter === "critical") return keyword.priority === "critical";
  if (filter === "preferred") return keyword.priority === "preferred";
  if (filter === "missing") return keyword.coverage === "none";
  if (filter === "skills") return keyword.coverage === "skills";
  return true;
}

export function AtsKeywordList({ keywords }: { keywords: AtsKeyword[] }) {
  const [filter, setFilter] = useState<KeywordFilter>("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return keywords.filter((keyword) => {
      if (!matchesFilter(keyword, filter)) return false;
      if (!search) return true;
      return (
        keyword.label.toLowerCase().includes(search) ||
        ATS_CATEGORY_LABELS[keyword.category].toLowerCase().includes(search) ||
        keyword.relatedSkills?.some((skill) => skill.toLowerCase().includes(search))
      );
    });
  }, [filter, keywords, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5">
        <label className="relative block">
          <span className="sr-only">Search job keywords</span>
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search keywords..."
            className="h-10 w-full rounded-input border border-glass-border bg-transparent pl-9 pr-3 text-sm text-foreground transition-colors placeholder:text-foreground-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </label>

        <div className="flex flex-wrap gap-1.5" aria-label="Keyword filters">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "rounded-chip border px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === option.value
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-glass-border text-foreground-secondary hover:border-primary/30 hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p aria-live="polite" className="text-[11px] text-foreground-secondary">
          {filtered.length} of {keywords.length} keywords
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="ats-pop rounded-card border border-glass-border bg-muted/20 px-4 py-8 text-center text-sm text-foreground-secondary">
          No keywords match this filter.
        </div>
      ) : (
        <ul className="ats-stagger overflow-hidden rounded-card border border-glass-border">
          {filtered.map((keyword) => {
            const isExpanded = expandedId === keyword.id;
            const canExpand = keyword.locations.length > 0 || !!keyword.jdSnippet;
            const panelId = `ats-keyword-details-${keyword.id.replace(/[^a-z0-9-]/gi, "-")}`;

            return (
              <li key={keyword.id} className="border-b border-glass-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : keyword.id)}
                  aria-expanded={canExpand ? isExpanded : undefined}
                  aria-controls={canExpand ? panelId : undefined}
                  aria-label={`${isExpanded ? "Hide" : "Show"} details for ${keyword.label}`}
                  disabled={!canExpand}
                  className={cn(
                    "group flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 sm:px-4",
                    canExpand && "cursor-pointer hover:bg-muted/30",
                    !canExpand && "cursor-default"
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    <KeywordStatusIcon keyword={keyword} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-foreground">
                        {keyword.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-chip border px-1.5 py-0.5 text-[10px] font-medium",
                          PRIORITY_CLASSES[keyword.priority]
                        )}
                      >
                        {PRIORITY_LABELS[keyword.priority]}
                      </span>
                      <span className="text-[10px] text-foreground-secondary">
                        {keyword.frequency} {keyword.frequency === 1 ? "mention" : "mentions"}
                      </span>
                    </span>

                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-foreground-secondary">
                      <span>{ATS_CATEGORY_LABELS[keyword.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={cn(
                          keyword.coverage === "strong" && "text-success",
                          keyword.coverage === "supporting" && "text-primary",
                          keyword.coverage === "skills" && "text-warning",
                          keyword.coverage === "none" && "text-error"
                        )}
                      >
                        {coverageLabel(keyword)}
                      </span>
                      {keyword.match === "related" && keyword.matchedAlias && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Related: {keyword.matchedAlias}</span>
                        </>
                      )}
                      {keyword.relatedSkills && keyword.relatedSkills.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-primary">
                            Related in resume: {keyword.relatedSkills.join(", ")}
                          </span>
                        </>
                      )}
                    </span>
                  </span>

                  {canExpand && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-button text-foreground-secondary transition-colors group-hover:bg-muted group-hover:text-foreground">
                      <ChevronDown
                        size={15}
                        className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
                      />
                    </span>
                  )}
                </button>

                {isExpanded && canExpand && (
                  <div
                    id={panelId}
                    role="region"
                    aria-label={`${keyword.label} details`}
                    className="ats-detail border-t border-glass-border bg-muted/20 px-3.5 py-3 sm:px-4"
                  >
                    {keyword.jdSnippet && (
                      <p className="text-xs leading-relaxed text-foreground-secondary">
                        <span className="font-semibold text-foreground">Job description: </span>
                        “{keyword.jdSnippet}”
                      </p>
                    )}

                    {keyword.locations.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {keyword.locations.map((location, index) => (
                          <li
                            key={`${keyword.id}-${location.section}-${index}`}
                            className="rounded-input border border-glass-border bg-popover/60 px-2.5 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                              <span className="font-semibold text-foreground">
                                {location.sectionLabel}
                              </span>
                              {location.entryLabel && (
                                <>
                                  <span aria-hidden="true" className="text-foreground-secondary">
                                    ·
                                  </span>
                                  <span className="text-foreground-secondary">
                                    {location.entryLabel}
                                  </span>
                                </>
                              )}
                              <span className="text-foreground-secondary">
                                {location.match === "exact" ? "Exact wording" : "Related wording"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">
                              {location.snippet}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {keyword.locations.length === 0 && (
                      <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">
                        This keyword was not found anywhere in your resume.
                        {keyword.relatedSkills && keyword.relatedSkills.length > 0
                          ? ` Your resume does mention related skills: ${keyword.relatedSkills.join(", ")}. Only add ${keyword.label} if you have real experience with it.`
                          : ""}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
