import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { SectionStatus } from "@/types/resume";
import { cn } from "@/lib/utils";

const CONFIG: Record<SectionStatus, { Icon: typeof CheckCircle2; className: string; label: string }> = {
  complete: { Icon: CheckCircle2, className: "text-success", label: "Completed" },
  partial: { Icon: AlertTriangle, className: "text-warning", label: "Partially completed" },
  empty: { Icon: XCircle, className: "text-foreground-secondary/50", label: "Empty" },
};

export function StatusIcon({ status, className }: { status: SectionStatus; className?: string }) {
  const { Icon, className: colorClass, label } = CONFIG[status];
  return (
    <span title={label} aria-label={label} className="inline-flex">
      <Icon size={16} strokeWidth={2} className={cn(colorClass, className)} />
    </span>
  );
}
