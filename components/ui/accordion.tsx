"use client";

import { createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusIcon } from "./status-icon";
import type { SectionStatus } from "@/types/resume";

interface AccordionContextValue {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export function Accordion({
  activeId,
  onActiveChange,
  children,
  className,
}: {
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AccordionContext.Provider value={{ activeId, setActiveId: onActiveChange }}>
      <div className={cn("flex flex-col divide-y divide-glass-border", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  id,
  title,
  status,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  children,
}: {
  id: string;
  title: string;
  status: SectionStatus;
  /** Omit either to hide the reorder controls entirely (e.g. the pinned
   *  Personal Details item, which isn't part of sectionOrder) -- same
   *  convention as EntryCard's onMoveUp/onMoveDown. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children: React.ReactNode;
}) {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionItem must be used inside <Accordion>");

  const isOpen = ctx.activeId === id;
  const triggerId = `accordion-trigger-${id}`;
  const panelId = `accordion-panel-${id}`;
  const showReorder = !!onMoveUp && !!onMoveDown;

  return (
    // `layout="position"` (not the default `layout`/`true`) animates ONLY
    // this item's x/y position when resume.sectionOrder reorders its
    // siblings -- deliberately NOT its size, so it doesn't fight the
    // separate open/close height animation on the panel below (which
    // already handles its own height via AnimatePresence). Framer Motion
    // detects the reorder automatically because each AccordionItem keeps
    // the same React key (the section id) across the move.
    <motion.div layout="position" transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="relative">
      {isOpen && (
        <motion.div
          layoutId="active-section-indicator"
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary to-accent"
        />
      )}
      <div
        className={cn(
          "group flex w-full items-center gap-1 pr-2 transition-all duration-200 hover:bg-muted/60 focus-within:bg-muted/60",
          isOpen && "bg-primary/5"
        )}
      >
        {showReorder && (
          // Far left, right next to the status icon -- reordering is a
          // rare action (most people set section order once, if ever),
          // so it sits out of the way of the primary expand/collapse
          // click target instead of competing with the chevron on the
          // right for attention. A trailing divider (not the expand
          // chevron's matching glyph) keeps "move" visually distinct
          // from "expand" -- see AGENTS notes: chevron-down/up/down all
          // looked identical when the up/down controls sat beside the
          // chevron. Straight ArrowUp/ArrowDown icons reinforce that
          // same distinction.
          <div className="flex shrink-0 items-center gap-0.5 border-r border-glass-border py-4 pl-3 pr-2">
            <button
              type="button"
              title={`Move ${title} section up`}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={!canMoveUp}
              aria-label={`Move ${title} section up`}
              className="flex h-7 w-7 items-center justify-center rounded-button border border-transparent text-foreground-secondary
                         transition-colors hover:border-glass-border hover:bg-muted hover:text-foreground
                         disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowUp size={13} />
            </button>
            <button
              type="button"
              title={`Move ${title} section down`}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={!canMoveDown}
              aria-label={`Move ${title} section down`}
              className="flex h-7 w-7 items-center justify-center rounded-button border border-transparent text-foreground-secondary
                         transition-colors hover:border-glass-border hover:bg-muted hover:text-foreground
                         disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowDown size={13} />
            </button>
          </div>
        )}

        <button
          id={triggerId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => ctx.setActiveId(isOpen ? null : id)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 py-4 pr-2 text-left transition-[padding] duration-200 focus-visible:outline-none active:scale-[0.99]",
            showReorder ? "pl-3 group-hover:pl-4" : "pl-5 group-hover:pl-6"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={status}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <StatusIcon status={status} />
            </motion.span>
          </AnimatePresence>
          <span className="flex-1 truncate font-mono text-sm font-medium text-foreground">{title}</span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0, scale: isOpen ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="text-foreground-secondary"
          >
            <ChevronDown size={16} />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
