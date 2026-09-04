"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110 hover:shadow-[0_0_24px_-4px_var(--color-primary)] active:brightness-95",
  secondary:
    "glass-surface text-foreground hover:border-primary/40 hover:text-foreground active:scale-[0.98]",
  danger:
    "border border-error/40 text-error bg-transparent hover:bg-error/10 active:scale-[0.98]",
  ghost:
    "text-foreground-secondary hover:text-foreground hover:bg-muted active:scale-[0.98]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-button font-medium",
          "transition-all duration-200 ease-out",
          "disabled:opacity-40 disabled:pointer-events-none",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          "hover:-translate-y-[1px]",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
