"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Copy, Trash2, Plus, Pencil } from "lucide-react";
import { useResume } from "@/hooks/use-resume";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { cn } from "@/lib/utils";

const DROPDOWN_WIDTH = 288; // matches w-72 below
const VIEWPORT_MARGIN = 8;

export function ResumeSwitcher() {
  const {
    resumes,
    activeResumeId,
    switchResume,
    createResume,
    duplicateResume,
    renameResume,
    deleteResume,
  } = useResume();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeResume = resumes.find((r) => r.id === activeResumeId);

  const close = useCallback(() => {
    setOpen(false);
    setRenamingId(null);
  }, []);

  // Positioned via the trigger's own viewport rect + `position: fixed`,
  // and rendered through a portal straight onto <body> -- NOT as a plain
  // CSS-absolute child of the trigger. The builder panel that contains
  // this switcher has `overflow-hidden` (needed for its own rounded-
  // corner clipping around its internally scrolling section list), which
  // was silently clipping the dropdown's lower half whenever a plain
  // absolute-positioned child tried to overflow that panel's bounds.
  // Escaping via a portal is the standard fix -- CSS alone can't opt an
  // element out of an ancestor's overflow clipping.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_MARGIN);
    setCoords({ top: rect.bottom + 6, left: Math.max(VIEWPORT_MARGIN, left) });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      close();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    // A scroll anywhere (the page, or the builder panel's own internal
    // section list) can move the trigger relative to the viewport --
    // closing rather than repositioning keeps this simple and avoids any
    // chance of the dropdown drifting away from its trigger mid-scroll.
    function handleScroll() {
      close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open, close]);

  const commitRename = (id: string) => {
    renameResume(id, renameDraft);
    setRenamingId(null);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex max-w-[130px] items-center gap-1.5 rounded-button border border-glass-border
                   bg-muted/50 px-3 py-2 text-sm font-medium text-foreground transition-colors
                   hover:bg-muted sm:max-w-[180px]"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <span className="truncate">{activeResume?.name ?? "My Resume"}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-foreground-secondary transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={{ position: "fixed", top: coords.top, left: coords.left, width: DROPDOWN_WIDTH }}
            className="z-[60] rounded-input border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl"
          >
            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {resumes.map((r) => {
                const isActive = r.id === activeResumeId;
                const isRenaming = renamingId === r.id;
                return (
                  <div key={r.id} className="group flex items-center gap-1 rounded-button transition-colors hover:bg-muted/60">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => commitRename(r.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(r.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="my-0.5 flex-1 rounded-button bg-transparent px-2.5 py-1.5 text-sm
                                   text-foreground outline-none ring-1 ring-primary/50"
                      />
                    ) : (
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                          switchResume(r.id);
                          close();
                        }}
                        className="flex flex-1 items-center gap-2 rounded-button px-2.5 py-1.5
                                   text-left text-sm text-foreground"
                      >
                        <Check
                          size={13}
                          className={cn("shrink-0 text-primary", !isActive && "invisible")}
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{r.name}</span>
                      </button>
                    )}

                    {!isRenaming && (
                      <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-45 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(r.id);
                            setRenameDraft(r.name);
                          }}
                          aria-label={`Rename ${r.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-button
                                     text-foreground-secondary hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateResume(r.id)}
                          aria-label={`Duplicate ${r.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-button
                                     text-foreground-secondary hover:bg-muted hover:text-foreground"
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: r.id, name: r.name })}
                          disabled={resumes.length <= 1}
                          aria-label={`Delete ${r.name}`}
                          title={resumes.length <= 1 ? "Can't delete your only resume" : undefined}
                          className="flex h-6 w-6 items-center justify-center rounded-button
                                     text-foreground-secondary hover:bg-error/15 hover:text-error
                                     disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="my-1.5 h-px bg-glass-border" />

            <button
              type="button"
              onClick={() => {
                createResume();
                close();
                showToast("New resume created", "success");
              }}
              className="flex w-full items-center gap-2 rounded-button px-2.5 py-1.5 text-left
                         text-sm font-medium text-primary hover:bg-muted"
            >
              <Plus size={14} /> New Resume
            </button>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteResume(deleteTarget.id);
          showToast(`"${deleteTarget.name}" deleted`);
        }}
        title="Delete this resume?"
        description={
          deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. This can't be undone.` : ""
        }
        confirmLabel="Delete Resume"
      />
    </div>
  );
}
