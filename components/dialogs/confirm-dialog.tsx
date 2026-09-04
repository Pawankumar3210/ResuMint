"use client";

import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <AlertTriangle size={22} strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-foreground-secondary">{description}</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
