"use client";

import { useState } from "react";
import { SITE } from "@/constants/site";
import { TeamDialog } from "@/components/dialogs/team-dialog";

export function Footer() {
  const [teamOpen, setTeamOpen] = useState(false);

  return (
    <footer className="relative mt-auto pt-14 pb-14 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "#3B82F6" }}
      />
      <div className="relative mx-auto max-w-lg px-6">
        <p className="footer-neon-glow text-sm font-medium text-foreground">
          Built with Purpose. Preserved for Excellence.
        </p>
        <p className="mt-2 text-xs text-foreground-secondary">
          Built, Tested &amp; Optimized by{" "}
          <button type="button" onClick={() => setTeamOpen(true)} className="footer-team-glow">
            {SITE.builtBy}
          </button>
          .
        </p>
      </div>

      <TeamDialog open={teamOpen} onClose={() => setTeamOpen(false)} />
    </footer>
  );
}
