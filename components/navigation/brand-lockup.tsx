"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTheme } from "@/hooks/use-theme";

type BrandLockupVariant = "hero" | "navbar";

// Source logo-mark.png is 690x807 (not square) -- height computed to
// preserve its actual aspect ratio at each size.
const LOGO_ASPECT = 807 / 690;

const SIZES: Record<BrandLockupVariant, { logoWidth: number; text: string }> = {
  hero: { logoWidth: 52, text: "text-4xl sm:text-5xl" },
  navbar: { logoWidth: 24, text: "text-lg" },
};

/**
 * Rendered once in the Hero and once in the Navbar, always with the same
 * layoutId. Framer Motion tracks the outgoing instance's rect when the Hero
 * unmounts and animates the incoming Navbar instance from that rect --
 * this is what produces the "logo morphs into the navbar" signature
 * transition described in the technical spec, with no manual keyframing.
 *
 * The wordmark is two-tone ("Resu" / "Mint") using the brand's own navy +
 * teal -- but the navy is swapped for a light color in dark mode, since
 * the source navy is nearly invisible against a near-black background
 * (measured contrast ~1.15:1). Teal works acceptably in both themes as-is.
 *
 * The logo mark itself has the same navy-on-transparent problem, so it
 * ships as two pre-rendered raster variants (logo-mark.png for light mode,
 * logo-mark-dark.png with the navy line-work swapped for the same light
 * color as the wordmark) and picks the right one from theme. Defaults to
 * the dark-mode asset before mount, matching the app's dark-first default.
 */
export function BrandLockup({ variant }: { variant: BrandLockupVariant }) {
  const { logoWidth, text } = SIZES[variant];
  const logoHeight = Math.round(logoWidth * LOGO_ASPECT);
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "light" ? "/logo-mark.png" : "/logo-mark-dark.png";

  return (
    <motion.div
      layoutId="resumint-brand-lockup"
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2.5"
    >
      <Image
        src={logoSrc}
        alt=""
        width={logoWidth}
        height={logoHeight}
        priority
        className="shrink-0"
      />
      <span className={`font-semibold tracking-tight ${text}`}>
        <span style={{ color: "var(--brand-resu)" }}>Resu</span>
        <span style={{ color: "var(--brand-mint)" }}>Mint</span>
      </span>
    </motion.div>
  );
}
