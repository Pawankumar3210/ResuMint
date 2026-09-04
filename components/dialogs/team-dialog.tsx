"use client";

import Image from "next/image";
import { Cog, Shield, Palette, Rocket, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";

/** lucide-react dropped brand icons, so this is a small inline glyph
 *  instead -- inherits currentColor to match each member's pill color. */
function LinkedInGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

interface TeamMember {
  name: string;
  linkedin: string;
  icon: LucideIcon;
  color: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Pawan Kumar G",
    linkedin: "https://www.linkedin.com/in/pawan-kumar-g/",
    icon: Cog,
    color: "#22d3ee",
  },
  {
    name: "Keerthana D",
    linkedin: "https://www.linkedin.com/in/keerthana-d-653313398",
    icon: Shield,
    color: "#a78bfa",
  },
  {
    name: "Poorvi V Bharadwaj",
    linkedin: "https://www.linkedin.com/in/poorvi-v-bharadwaj-603837391",
    icon: Palette,
    color: "#fb923c",
  },
  {
    name: "Poorvika MJ",
    linkedin: "https://www.linkedin.com/in/poorvika-mj-aba066392/",
    icon: Rocket,
    color: "#34d399",
  },
];

export function TeamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Team Udbhav"
      unstyled
      hideCloseButton
      className="team-dialog-card max-w-sm overflow-hidden rounded-[20px] p-0"
    >
      <button type="button" onClick={onClose} aria-label="Close" className="team-dialog-close">
        <X size={16} />
      </button>

      <div className="flex flex-col items-center px-6 pb-2 pt-8">
        <div className="team-dialog-logo-ring">
          <Image
            src="/team-udbhav-badge.png"
            alt="Team Udbhav"
            width={64}
            height={64}
            className="h-16 w-16 object-cover"
          />
        </div>
        <h2 className="team-dialog-title mt-3 text-lg font-bold uppercase tracking-wide">
          Team Udbhav
        </h2>
        <p className="team-dialog-subtitle mt-1 text-[11px] uppercase tracking-[0.2em]">
          The Architects of ResuMint
        </p>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-6 pt-4">
        {TEAM_MEMBERS.map((member) => (
          <a
            key={member.name}
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="team-dialog-row"
            style={{ "--member-color": member.color } as React.CSSProperties}
          >
            <span className="team-dialog-icon">
              <member.icon size={16} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="team-dialog-name block truncate text-sm font-semibold">
                {member.name}
              </span>
            </span>
            <span className="team-dialog-linkedin-pill">
              <LinkedInGlyph size={12} /> LinkedIn
            </span>
          </a>
        ))}
      </div>
    </Dialog>
  );
}
