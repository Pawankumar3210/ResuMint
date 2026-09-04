"use client";

import { motion } from "framer-motion";
import { Lock, FileCheck2, Wifi, Sparkles, type LucideIcon } from "lucide-react";
import { BrandLockup } from "./brand-lockup";
import { FEATURE_BADGES } from "@/constants/site";

const ICONS: Record<string, LucideIcon> = {
  Lock,
  FileCheck2,
  Wifi,
  Sparkles,
};

/**
 * The first thing a visitor sees. Fully self-contained: owns its own
 * entrance stagger and its own exit animation (driven by the parent
 * unmounting it inside AnimatePresence when the collapse timer fires).
 * The brand lockup inside uses a shared layoutId so it visually becomes
 * the Navbar logo on exit -- see BrandLockup and LandingExperience.
 */
export function HeroSection() {
  return (
    <motion.section
      exit={{ opacity: 0, y: -48 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[85vh] flex-col items-center justify-center gap-8 px-6 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <BrandLockup variant="hero" />
      </motion.div>

      <motion.ul
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
        }}
        className="flex flex-wrap items-center justify-center gap-3"
      >
        {FEATURE_BADGES.map((badge) => {
          const Icon = ICONS[badge.icon];
          return (
            <motion.li
              key={badge.label}
              variants={{
                hidden: { opacity: 0, y: 10, scale: 0.94 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="glass-surface flex items-center gap-2 rounded-chip px-4 py-2 text-sm text-foreground-secondary"
            >
              <Icon size={15} strokeWidth={1.75} className="text-primary" />
              {badge.label}
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.section>
  );
}
