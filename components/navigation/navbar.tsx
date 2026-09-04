"use client";

import { motion } from "framer-motion";
import { BrandLockup } from "./brand-lockup";
import { ThemeToggle } from "./theme-toggle";
import { SearchTrigger } from "./search-trigger";

/**
 * Sticky top bar. Deliberately minimal per spec: logo + search + theme
 * toggle, nothing else.
 *
 * Doesn't mount at all until the hero has collapsed (`showBrand`) --
 * before that, an empty-but-solid bar sat visibly across the top of the
 * intro/hero screen for the whole ~2s intro, which read as a stray,
 * unexplained strip above "ResuMint / Privacy First / ...". Now nothing
 * renders there until the moment the hero collapses, at which point this
 * reveals itself with a clip-path wipe (see the transition below) as the
 * brand lockup's own shared-layout animation morphs the hero's logo down
 * into place inside it -- the two feel like one coordinated motion
 * rather than a bar popping in and a logo separately sliding into it.
 *
 * Solid (bg-header), not glass-surface: the page below is tall enough
 * to scroll past this sticky bar, and a translucent `glass-surface`
 * background only blurs what's behind it rather than hiding it --
 * high-contrast text (e.g. the builder sidebar's section titles)
 * scrolling underneath showed through as a distracting, hard-to-read
 * ghost overlapping the navbar's own logo/search/toggle. `bg-header`
 * resolves to the same solid tone as --popover in dark mode, but to the
 * page's own cream --background in light mode -- avoiding a stark white
 * bar sitting against the cream page around it.
 */
export function Navbar({ showBrand }: { showBrand: boolean }) {
  if (!showBrand) return null;

  return (
    <motion.header
      // clip-path (not transform/y) so this reveal never disturbs the
      // BrandLockup child's own layoutId FLIP animation, which measures
      // real screen position via getBoundingClientRect -- a transform
      // on an ancestor would move that target mid-measurement, but
      // clip-path only affects what's painted, never layout or position.
      initial={{ clipPath: "inset(0 0 100% 0)" }}
      animate={{ clipPath: "inset(0 0 0% 0)" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 border-b border-glass-border bg-header text-popover-foreground"
    >
      <div className="relative mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 sm:px-6">
        {/* Three-column flex layout, not absolute centering -- the
            search trigger used to be `absolute left-1/2`, positioned at
            the navbar's literal midpoint regardless of how wide the
            logo or theme toggle actually rendered. On narrow phones
            that midpoint could land underneath the tail end of
            "ResuMint", visibly overlapping it. Giving the outer two
            slots matching `flex-1` growth keeps the middle item
            centered when there's room, while normal flex flow (unlike
            absolute positioning) guarantees these three can never
            overlap, only ever get tighter. */}
        <div className="flex min-w-0 flex-1 items-center">
          <div className="min-h-[26px] min-w-0">
            <BrandLockup variant="navbar" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0"
        >
          <SearchTrigger />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 justify-end"
        >
          <ThemeToggle />
        </motion.div>
      </div>
    </motion.header>
  );
}
