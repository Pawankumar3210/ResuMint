export const SITE = {
  name: "ResuMint",
  tagline: "Create ATS-Friendly Resume in Minutes.",
  description:
    "A privacy-first ATS resume builder for students and fresh graduates. No login, no ads, no watermarks — build, preview and download a professional resume in minutes, entirely in your browser.",
  url: "https://resumint.vercel.app",
  builtBy: "Team Udbhav",
} as const;

export const FEATURE_BADGES = [
  { icon: "Lock", label: "Privacy First" },
  { icon: "FileCheck2", label: "ATS Optimized" },
  { icon: "Wifi", label: "Works Offline" },
  { icon: "Sparkles", label: "Forever Free" },
] as const;

/** How long (ms) after first paint the hero collapses into the navbar. */
export const HERO_TRANSITION_DELAY_MS = 2000;

/** How many days to suppress the install prompt after "Maybe Later". */
export const INSTALL_PROMPT_SNOOZE_DAYS = 30;
