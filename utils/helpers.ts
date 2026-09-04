export function formatDateRange(
  startMonth: string,
  startYear: string,
  endMonth: string,
  endYear: string,
  current?: boolean
): string {
  const start = [startMonth, startYear].filter(Boolean).join(" ");
  if (current) return start ? `${start} — Present` : "";
  const end = [endMonth, endYear].filter(Boolean).join(" ");
  if (!start && !end) return "";
  if (start && end) return `${start} — ${end}`;
  return start || end;
}

export function joinNonEmpty(parts: (string | undefined | null)[], separator = " · "): string {
  return parts.filter((p) => p && p.trim().length > 0).join(separator);
}
