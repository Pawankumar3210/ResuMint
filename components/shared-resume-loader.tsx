"use client";

/**
 * SharedResumeLoader
 *
 * Mounts in the main layout / page. Subscribes to window.location.hash
 * using useSyncExternalStore for clean, reactive zero-backend resume sharing.
 * If a valid encoded resume payload is found, prompts the user to load it.
 * Never silently overrides existing data without confirmation.
 */
import { useState, useMemo, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, CheckCircle } from "lucide-react";
import { decodeResumeFromHash } from "@/utils/shareResume";
import { mergeResumeWithDefaults, EMPTY_RESUME } from "@/constants/resume-defaults";
import { useResume } from "@/hooks/use-resume";
import { useToast } from "@/hooks/use-toast";

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot(): string {
  return typeof window !== "undefined" ? window.location.hash : "";
}

function getServerSnapshot(): string {
  return "";
}

export function SharedResumeLoader() {
  const { setResume } = useResume();
  const { showToast } = useToast();
  const [dismissed, setDismissed] = useState(false);

  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, getServerSnapshot);

  const sharedResume = useMemo(() => {
    if (!hash) return null;
    const parsed = decodeResumeFromHash(hash);
    return parsed ? mergeResumeWithDefaults(parsed, EMPTY_RESUME) : null;
  }, [hash]);

  if (!sharedResume || dismissed) return null;

  const candidateName = sharedResume.personal?.fullName?.trim() || "Shared Resume";

  const handleLoad = () => {
    setResume(sharedResume);
    // Clear hash without reloading the page
    if (typeof window !== "undefined") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    showToast(`Loaded "${candidateName}" into editor!`, "success");
    setDismissed(true);
  };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
          className="fixed inset-x-4 top-4 z-[9999] mx-auto flex max-w-lg items-center gap-3.5 rounded-2xl border border-primary/40 bg-popover/95 p-3.5 shadow-2xl backdrop-blur-md sm:p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-xs">
            <Share2 size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Shared Resume Detected
            </p>
            <p className="truncate text-xs text-foreground-secondary">
              <span className="font-medium text-foreground">{candidateName}</span> is ready to view
              or edit.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleLoad}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-transform hover:opacity-90 active:scale-95"
            >
              <CheckCircle size={13} />
              <span>Load</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
