"use client";

import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const activeIndex = options.findIndex((opt) => opt.value === value);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div
        className="relative flex rounded-input border border-glass-border bg-popover p-1"
        role="radiogroup"
        aria-label={label}
      >
        {/* Plain CSS-transitioned pill instead of a Framer Motion layoutId
            projection -- the latter applies its own transform/filter
            tracking to the element, which was the one thing structurally
            different about this component vs. everything else on the
            page that wasn't exhibiting the reported blur artifact. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-1 rounded-button bg-primary transition-all duration-300"
          style={{
            width: `calc(${100 / options.length}% - 4px)`,
            left: `calc(${(100 / options.length) * activeIndex}% + 2px)`,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 flex-1 rounded-button px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.04] active:scale-95",
              value === opt.value ? "text-primary-foreground" : "text-foreground-secondary hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
