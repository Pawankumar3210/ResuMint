"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Smoothly grows/shrinks `children` in and out, instead of them snapping
 * in and out instantly. Used for the "Include X on my resume" checkbox
 * pattern (Achievements/Declaration/Custom Section) and similar nested
 * reveals (Declaration's Place/Date/Signature sub-fields) -- toggling
 * the checkbox no longer causes the whole accordion panel to visibly
 * jump as fields abruptly appear or disappear.
 */
export function CollapsibleReveal({
  show,
  children,
  gap = "gap-4",
}: {
  show: boolean;
  children: React.ReactNode;
  /** Tailwind gap class applied between revealed children -- match
   *  whatever the surrounding flex container would have used for these
   *  same children were they not wrapped (e.g. "gap-3" for a tighter
   *  nested group). Defaults to "gap-4", the most common case. */
  gap?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className={`flex flex-col ${gap}`}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
