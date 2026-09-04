"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

export function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="glass-surface inline-flex items-center gap-1.5 rounded-chip py-1.5 pl-3.5 pr-2 text-sm text-foreground"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-foreground-secondary transition-colors hover:bg-error/15 hover:text-error"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </motion.span>
  );
}
