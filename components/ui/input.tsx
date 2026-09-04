"use client";

import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, optional, error, hint, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="flex items-baseline justify-between font-mono text-sm font-medium text-foreground">
          <span>
            {label}
            {optional && (
              <span className="ml-1.5 font-normal text-foreground-secondary">(optional)</span>
            )}
          </span>
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "h-11 rounded-input border bg-transparent px-3.5 text-sm text-foreground",
            "glass-surface placeholder:text-foreground-secondary/60",
            "transition-all duration-200 ease-out",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
            error ? "border-error/60" : "border-glass-border",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-error">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-foreground-secondary">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
