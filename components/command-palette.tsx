"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, Download, Trash2, Sparkles, SunMoon, Upload, Undo2, Redo2,
  User, FileText, GraduationCap, Briefcase, FolderGit2, Wrench,
  BadgeCheck, Trophy, Languages, FileSignature, LayoutList, Award, Heart,
} from "lucide-react";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useAppActions } from "@/hooks/use-app-actions";
import { useTheme } from "@/hooks/use-theme";
import { useResume } from "@/hooks/use-resume";
import { SECTION_META } from "@/constants/resume-defaults";
import type { SectionId } from "@/types/resume";

interface Command {
  id: string;
  label: string;
  icon: typeof Download;
  group: "Actions" | "Navigate";
  run: () => void;
}

const SECTION_ICONS: Record<SectionId, typeof Download> = {
  personal: User,
  summary: FileText,
  education: GraduationCap,
  experience: Briefcase,
  projects: FolderGit2,
  skills: Wrench,
  certifications: BadgeCheck,
  achievements: Trophy,
  leadership: Award,
  languages: Languages,
  interests: Heart,
  declaration: FileSignature,
  custom: LayoutList,
};

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const getActions = useAppActions();
  const { cycleTheme } = useTheme();
  const { undo, redo } = useResume();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(
    () => [
      {
        id: "download",
        label: "Download Resume",
        icon: Download,
        group: "Actions",
        run: () => getActions().openDownloadDialog?.(),
      },
      {
        id: "import",
        label: "Import Resume",
        icon: Upload,
        group: "Actions",
        run: () => getActions().openImportDialog?.(),
      },
      {
        id: "demo",
        label: "Try Demo Resume",
        icon: Sparkles,
        group: "Actions",
        run: () => getActions().loadDemoResume?.(),
      },
      {
        id: "clear",
        label: "Clear Resume",
        icon: Trash2,
        group: "Actions",
        run: () => getActions().requestClearResume?.(),
      },
      {
        id: "undo",
        label: "Undo",
        icon: Undo2,
        group: "Actions",
        run: () => undo(),
      },
      {
        id: "redo",
        label: "Redo",
        icon: Redo2,
        group: "Actions",
        run: () => redo(),
      },
      {
        id: "theme",
        label: "Toggle Theme",
        icon: SunMoon,
        group: "Actions",
        run: () => cycleTheme(),
      },
      ...(Object.keys(SECTION_META) as SectionId[]).map((id) => ({
        id: `go-${id}`,
        label: `Go to ${SECTION_META[id].label}`,
        icon: SECTION_ICONS[id],
        group: "Navigate" as const,
        run: () => getActions().jumpToSection?.(id),
      })),
    ],
    [getActions, cycleTheme, undo, redo]
  );

  const filtered = useMemo(
    () => commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query]
  );

  // Reset query/selection when the palette opens, and re-clamp the active
  // index whenever the filtered list changes -- both adjusted during render
  // per React's guidance, rather than in effects, since neither touches an
  // external system.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveIndex(0);
  }

  // Genuine side effect: moving DOM focus into the input once the palette
  // has mounted and its entrance animation has started.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const execute = (cmd?: Command) => {
    if (!cmd) return;
    cmd.run();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        execute(filtered[activeIndex]);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, activeIndex]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-background/75 backdrop-blur-md"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-surface relative w-full max-w-lg overflow-hidden rounded-dialog shadow-2xl"
          >
            <div className="flex items-center gap-2.5 border-b border-glass-border px-4 py-3.5">
              <Search size={16} className="text-foreground-secondary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-secondary/60 focus:outline-none"
              />
              <kbd className="rounded border border-glass-border px-1.5 py-0.5 text-[10px] text-foreground-secondary">
                Esc
              </kbd>
            </div>

            <ul role="listbox" className="max-h-96 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-foreground-secondary">
                  No matching commands.
                </li>
              )}
              {filtered.map((cmd, i) => {
                const prevGroup = i > 0 ? filtered[i - 1].group : null;
                const showGroupHeader = cmd.group !== prevGroup;
                return (
                  <li key={cmd.id}>
                    {showGroupHeader && (
                      <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-foreground-secondary first:pt-1">
                        {cmd.group}
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => execute(cmd)}
                      className={`flex w-full items-center gap-3 rounded-input px-3 py-2.5 text-left text-sm transition-colors ${
                        i === activeIndex ? "bg-primary/15 text-foreground" : "text-foreground-secondary"
                      }`}
                    >
                      <cmd.icon size={15} />
                      {cmd.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
