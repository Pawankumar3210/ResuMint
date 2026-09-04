"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Navbar } from "./navigation/navbar";
import { HeroSection } from "./navigation/hero-section";
import { Footer } from "./navigation/footer";
import { BuilderPreviewPanels } from "./builder-preview-panels";
import { TypingHeadline } from "./typing-headline";
import { HERO_TRANSITION_DELAY_MS } from "@/constants/site";

/**
 * Owns the one piece of state the whole landing flow revolves around:
 * whether the hero has collapsed into the navbar yet. Everything else
 * (the actual morph animation) is delegated to BrandLockup's shared
 * layoutId, so this component only manages *when*, not *how*.
 */
export function LandingExperience() {
  const [collapsed, setCollapsed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Users who've asked the OS for reduced motion shouldn't be forced to
    // sit through a 2s intro animation -- skip straight to the app.
    if (prefersReducedMotion) {
      // Syncing to the OS-level prefers-reduced-motion media query (an external system).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
      return;
    }

    const timer = setTimeout(() => setCollapsed(true), HERO_TRANSITION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Navbar showBrand={collapsed} />

      <AnimatePresence mode="wait">
        {!collapsed && <HeroSection key="hero" />}
      </AnimatePresence>

      {collapsed && (
        <motion.main
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[1600px] flex-1 px-6 pb-10 pt-20"
        >
          <div className="mb-8">
            <TypingHeadline />
          </div>

          {/* Side-by-side on desktop, tab-switched on mobile/tablet -- see BuilderPreviewPanels. */}
          <BuilderPreviewPanels />
        </motion.main>
      )}

      {collapsed && <Footer />}
    </div>
  );
}
