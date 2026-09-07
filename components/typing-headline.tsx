"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SITE } from "@/constants/site";

const TYPE_SPEED_MS = 42;
const START_DELAY_MS = 200;
/** How long the cursor keeps blinking after typing finishes before it
 *  fades out for good -- feedback from users found an indefinitely
 *  blinking cursor distracting once it's just sitting there with
 *  nothing left to "type". */
const CURSOR_LINGER_MS = 3000;

/**
 * Left-aligned typewriter headline shown in the main app view (below the
 * navbar, above the builder/preview panels) -- distinct from the Hero's
 * own copy of this same tagline, which only appears during the intro and
 * is gone by the time this renders. Reuses SITE.tagline rather than a
 * second hardcoded string, so the two never drift out of sync.
 *
 * Set in Space Grotesk (self-hosted, no runtime font fetch) rather than
 * the app's usual monospace -- a distinct, modern display face reserved
 * for this one headline, at roughly double the size of a normal heading.
 */
export function TypingHeadline() {
  const prefersReducedMotion = useReducedMotion();
  const fullText = SITE.tagline.replace(/\.$/, ""); // drop trailing period for a cleaner typed line
  const [visibleChars, setVisibleChars] = useState(prefersReducedMotion ? fullText.length : 0);
  const [started, setStarted] = useState(prefersReducedMotion);
  const [cursorPhase, setCursorPhase] = useState<"blinking" | "stopping" | "hidden">("blinking");
  const typingDone = visibleChars >= fullText.length;

  useEffect(() => {
    if (prefersReducedMotion) return;
    const startTimer = setTimeout(() => setStarted(true), START_DELAY_MS);
    return () => clearTimeout(startTimer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !started) return;
    if (visibleChars >= fullText.length) return;

    const timer = setTimeout(() => setVisibleChars((n) => n + 1), TYPE_SPEED_MS);
    return () => clearTimeout(timer);
  }, [visibleChars, fullText, started, prefersReducedMotion]);

  // Once the last character has appeared (or immediately, for
  // prefers-reduced-motion, where typing is skipped entirely), let the
  // cursor blink a little longer -- like a real line finishing, not an
  // abrupt cutoff -- then fade it out rather than leave it blinking
  // forever with nothing left to indicate.
  // Once the last character has appeared (or immediately, for
  // prefers-reduced-motion, where typing is skipped entirely), let the
  // cursor blink a little longer -- like a real line finishing, not an
  // abrupt cutoff -- then fade it out rather than leave it blinking
  // forever with nothing left to indicate.
  useEffect(() => {
    if (!typingDone) return;
    const hideTimer = setTimeout(() => setCursorPhase("stopping"), CURSOR_LINGER_MS);
    return () => clearTimeout(hideTimer);
  }, [typingDone]);

  // "stopping" (animation:none, still opaque) and "hidden" (opacity: 0)
  // are deliberately two separate renders one animation frame apart,
  // not one -- setting animation:none and the transitioned opacity
  // target in the exact same style update is ambiguous across browsers
  // (no guaranteed "before" state committed for the transition to
  // interpolate from, so it can just snap straight to invisible instead
  // of fading). This guarantees the browser has actually painted
  // "animation stopped, still opaque" before "now fade to 0" is
  // applied, which is what reliably triggers the transition.
  useEffect(() => {
    if (cursorPhase !== "stopping") return;
    const raf = requestAnimationFrame(() => setCursorPhase("hidden"));
    return () => cancelAnimationFrame(raf);
  }, [cursorPhase]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative inline-block"
    >
      {/* Soft ambient glow behind the whole line -- purely decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 35%, transparent), color-mix(in srgb, var(--color-accent) 35%, transparent))",
        }}
      />

      <p className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        <span
          className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent"
          style={{ filter: "drop-shadow(0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent))" }}
        >
          {fullText.slice(0, visibleChars)}
        </span>
        <span
          className="typing-cursor"
          aria-hidden="true"
          style={
            cursorPhase === "blinking"
              ? undefined
              : // animation:none stops the infinite blink (which would
                // otherwise keep overriding opacity every cycle, since an
                // active CSS animation wins over inline style values for
                // whichever property it's animating). opacity only flips
                // to 0 on the "hidden" phase, one frame after "stopping"
                // (see the effect above), so the transition has a real,
                // committed "before" value to animate from.
                { animation: "none", opacity: cursorPhase === "hidden" ? 0 : 1, transition: "opacity 0.6s ease-out" }
          }
        />
        <span className="sr-only">{fullText}</span>
      </p>
    </motion.div>
  );
}
