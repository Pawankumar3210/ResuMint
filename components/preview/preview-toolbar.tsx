"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Download,
  Sparkles,
  Loader2,
  FileText,
  Columns2,
  SlidersHorizontal,
  Share2,
  Check,
  ChevronDown,
  Maximize2,
} from "lucide-react";
import { useDemoResume } from "@/hooks/use-demo-resume";
import { useToast } from "@/hooks/use-toast";
import { useResume } from "@/hooks/use-resume";
import {
  CLASSIC_FONTS,
  MODERN_FONTS,
  DENSITY_OPTIONS,
} from "@/constants/resume-defaults";
import { encodeResumeToHash } from "@/utils/shareResume";
import type { ClassicFont, ModernFont, ResumeDensity } from "@/types/resume";
import { cn } from "@/lib/utils";

export function PreviewToolbar({
  onDownloadClick,
  onClearClick,
  onMobilePreviewClick,
}: {
  onDownloadClick: () => void;
  onClearClick: () => void;
  onMobilePreviewClick?: () => void;
}) {
  const { loadDemoResume, isLoadingDemo } = useDemoResume();
  const { showToast } = useToast();
  const {
    resume,
    setTemplate,
    setClassicFont,
    setModernFont,
    setDensity,
  } = useResume();
  const currentTemplate = resume.template ?? "classic";

  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const appearanceRef = useRef<HTMLDivElement>(null);

  const [shareCopied, setShareCopied] = useState(false);

  // Close appearance menu when clicking outside
  useEffect(() => {
    if (!appearanceOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (appearanceRef.current && !appearanceRef.current.contains(e.target as Node)) {
        setAppearanceOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [appearanceOpen]);

  const handleDemo = () => {
    loadDemoResume().then(() => showToast("Demo Loaded", "success"));
  };

  const handleShare = async () => {
    try {
      const hash = encodeResumeToHash(resume);
      if (typeof window !== "undefined") {
        window.location.hash = hash;
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        showToast("Shareable link copied to clipboard!", "success");
        setTimeout(() => setShareCopied(false), 2200);
      }
    } catch {
      showToast("Link set in URL hash — copy from address bar", "default");
    }
  };

  const activeFontId =
    currentTemplate === "modern"
      ? (resume.modernFont ?? "inter")
      : (resume.classicFont ?? "garamond");

  const activeFontLabel =
    (currentTemplate === "modern" ? MODERN_FONTS : CLASSIC_FONTS).find(
      (f) => f.id === activeFontId
    )?.label ?? "Font";

  const activeDensity = resume.density ?? "standard";

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1">
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          <motion.span
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            Resume Preview
          </motion.span>
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Animated Sleek Template Switcher: Classic vs Modern with gliding spring pill */}
        <div
          role="radiogroup"
          aria-label="Resume template style"
          className="relative inline-flex items-center rounded-full border border-glass-border bg-popover/80 p-0.5 text-xs font-medium shadow-2xs backdrop-blur-xs"
        >
          <button
            type="button"
            role="radio"
            aria-checked={currentTemplate === "classic"}
            onClick={() => setTemplate("classic")}
            title="Classic: Single-column serif layout"
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200",
              currentTemplate === "classic"
                ? "text-primary-foreground font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            )}
          >
            {currentTemplate === "classic" && (
              <motion.span
                layoutId="active-template-pill"
                className="absolute inset-0 rounded-full bg-primary shadow-xs"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <FileText
                size={12}
                className={cn("transition-opacity", currentTemplate === "classic" ? "opacity-100" : "opacity-60")}
              />
              Classic
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={currentTemplate === "modern"}
            onClick={() => setTemplate("modern")}
            title="Modern: Two-column sans-serif layout"
            className={cn(
              "relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200",
              currentTemplate === "modern"
                ? "text-primary-foreground font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            )}
          >
            {currentTemplate === "modern" && (
              <motion.span
                layoutId="active-template-pill"
                className="absolute inset-0 rounded-full bg-primary shadow-xs"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Columns2
                size={12}
                className={cn("transition-opacity", currentTemplate === "modern" ? "opacity-100" : "opacity-60")}
              />
              Modern
            </span>
          </button>
        </div>

        {/* Appearance Popover: ATS Font & Line Density Control */}
        <div className="relative" ref={appearanceRef}>
          <button
            type="button"
            onClick={() => setAppearanceOpen((prev) => !prev)}
            aria-label="Appearance settings: Font and Density"
            title={`Font: ${activeFontLabel} | Density: ${activeDensity}`}
            className={cn(
              "flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3",
              appearanceOpen
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-glass-border text-foreground-secondary hover:border-primary/40 hover:text-foreground"
            )}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Appearance</span>
            <ChevronDown
              size={11}
              className={cn("transition-transform duration-200", appearanceOpen && "rotate-180")}
            />
          </button>

          <AnimatePresence>
            {appearanceOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-glass-border bg-popover/95 p-4 shadow-xl backdrop-blur-md"
              >
                {/* Font Selector */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-secondary">
                      {currentTemplate === "modern" ? "Modern" : "Classic"} Font
                    </span>
                    <span className="text-[10px] text-zinc-400">ATS-Safe</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {(currentTemplate === "modern" ? MODERN_FONTS : CLASSIC_FONTS).map((font) => {
                      const isActive =
                        currentTemplate === "modern"
                          ? (resume.modernFont ?? "inter") === font.id
                          : (resume.classicFont ?? "garamond") === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => {
                            if (currentTemplate === "modern") {
                              setModernFont(font.id as ModernFont);
                            } else {
                              setClassicFont(font.id as ClassicFont);
                            }
                          }}
                          className={cn(
                            "relative flex items-center justify-between rounded-xl px-2.5 py-1.5 text-sm transition-all duration-150",
                            isActive
                              ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/30"
                              : "text-foreground hover:bg-muted/70"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-glass-border bg-muted/60 text-xs font-semibold"
                              style={{ fontFamily: font.fontFamily }}
                            >
                              Aa
                            </span>
                            <span className="truncate text-xs sm:text-sm" style={{ fontFamily: font.fontFamily }}>
                              {font.label}
                            </span>
                          </div>
                          {isActive && (
                            <motion.span
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="text-primary"
                            >
                              <Check size={14} strokeWidth={2.5} />
                            </motion.span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Density Switcher */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground-secondary">
                      Line Density
                    </span>
                    <span className="text-[10px] text-zinc-400">Vertical spacing</span>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label="Resume line density"
                    className="relative flex rounded-xl border border-glass-border bg-muted/40 p-1"
                  >
                    {DENSITY_OPTIONS.map((opt) => {
                      const isActive = (resume.density ?? "standard") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setDensity(opt.id as ResumeDensity)}
                          title={opt.description}
                          className={cn(
                            "relative z-10 flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-colors duration-150",
                            isActive
                              ? "text-primary-foreground font-semibold"
                              : "text-foreground-secondary hover:text-foreground"
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="active-density-pill"
                              className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                              transition={{ type: "spring", stiffness: 450, damping: 32 }}
                            />
                          )}
                          <span className="relative z-10">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Demo Resume button */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={isLoadingDemo}
          aria-label={isLoadingDemo ? "Loading demo resume" : "Try demo resume"}
          className="flex items-center gap-1.5 rounded-button border border-glass-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60 sm:px-3"
        >
          {isLoadingDemo ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          <span className="hidden sm:inline">{isLoadingDemo ? "Loading..." : "Try Demo"}</span>
        </button>

        {/* Zero-Backend Share Link Button */}
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share resume via URL link"
          title="Create a shareable link encoded directly into the URL (Zero backend)"
          className="flex items-center gap-1.5 rounded-button border border-glass-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-primary/40 hover:text-foreground sm:px-3"
        >
          {shareCopied ? (
            <>
              <Check size={13} className="text-emerald-500" />
              <span className="hidden sm:inline text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Share2 size={13} />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>

        {/* Mobile Full-Screen Preview trigger */}
        {onMobilePreviewClick && (
          <button
            type="button"
            onClick={onMobilePreviewClick}
            aria-label="Full-screen preview"
            title="Open full-screen mobile preview"
            className="flex items-center gap-1.5 rounded-button border border-glass-border px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:border-primary/40 hover:text-foreground lg:hidden"
          >
            <Maximize2 size={13} />
            <span className="text-xs">Preview</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClearClick}
          aria-label="Clear resume"
          className="flex items-center gap-1.5 rounded-button px-2.5 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-error/10 hover:text-error sm:px-3"
        >
          <Trash2 size={13} /> <span className="hidden sm:inline">Clear</span>
        </button>

        <button
          type="button"
          onClick={onDownloadClick}
          aria-label="Download resume"
          className="flex items-center gap-1.5 rounded-button bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:-translate-y-[1px] hover:shadow-[0_0_20px_-4px_var(--color-primary)] active:translate-y-0 animate-cta-pulse sm:px-3.5"
        >
          <Download size={13} /> <span className="hidden sm:inline">Download ▾</span>
        </button>
      </div>
    </div>
  );
}
