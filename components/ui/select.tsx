"use client";

import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  optional?: boolean;
  options: readonly string[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, optional, options, placeholder = "Select", className, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="font-mono text-sm font-medium text-foreground">
          {label}
          {optional && (
            <span className="ml-1.5 font-normal text-foreground-secondary">(optional)</span>
          )}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "h-11 w-full appearance-none rounded-input border border-glass-border bg-transparent px-3.5 pr-9 text-sm text-foreground",
              "glass-surface",
              "transition-colors duration-200",
              "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25",
              className
            )}
            {...props}
          >
            <option value="" disabled hidden>
              {placeholder}
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt} className="bg-popover text-popover-foreground">
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary"
          />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";
