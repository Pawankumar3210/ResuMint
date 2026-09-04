"use client";

import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  optional?: boolean;
  error?: string;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, optional, error, maxLength, className, id, value, ...props }, ref) => {
    const autoId = useId();
    const textareaId = id ?? autoId;
    const length = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor={textareaId} className="font-mono text-sm font-medium text-foreground">
            {label}
            {optional && (
              <span className="ml-1.5 font-normal text-foreground-secondary">(optional)</span>
            )}
          </label>
          {maxLength && (
            <span
              className={cn(
                "text-xs tabular-nums transition-colors duration-200",
                length >= maxLength ? "text-warning" : "text-foreground-secondary"
              )}
            >
              {length} / {maxLength}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          aria-invalid={!!error}
          rows={4}
          className={cn(
            "resize-none rounded-input border bg-transparent px-3.5 py-2.5 text-sm text-foreground",
            "glass-surface placeholder:text-foreground-secondary/60",
            "transition-all duration-200 ease-out",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
            error ? "border-error/60" : "border-glass-border",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
