"use client";

import { motion } from "framer-motion";

/**
 * Shown before the person has entered anything. Rather than a generic
 * "nothing here yet" message, this renders a full skeletal mock of what
 * a finished resume looks like -- same paper, same monospace/bold-heading
 * format as the real ResumePaper, but every value is obviously placeholder
 * ghost text (muted gray, example content) rather than real data. The
 * goal is that a first-time visitor instantly understands the shape of
 * what they're about to build, before typing a single character.
 */
export function EmptyPreview() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="resume-paper mx-auto flex aspect-[210/297] w-full max-w-[820px] shrink-0 flex-col gap-6 px-10 py-12 font-mono text-[12.5px] leading-relaxed text-zinc-400"
    >
      <header className="flex flex-col items-center gap-1.5 pb-2 text-center">
        <h1 className="text-[26px] font-bold uppercase tracking-wide text-zinc-400">
          Your Full Name
        </h1>
        <p className="text-[11.5px] text-zinc-400">
          email &middot; phone &middot; linkedin &middot; github &middot; location
        </p>
      </header>

      <SkeletonSection title="Summary">
        Concise 3-4 line professional summary with metrics and intent. E.g. CS undergrad with X,
        built Y used by Z users, seeking...
      </SkeletonSection>

      <SkeletonSection title="Education">
        B.Tech Computer Science, VIT Vellore — Vellore, TN &middot; 9.1 CGPA | Aug 2021 – May 2025
      </SkeletonSection>

      <SkeletonSection title="Experience">
        Add internships, leadership, or work. Use bullet points starting with verbs and include
        numbers.
      </SkeletonSection>

      <SkeletonSection title="Projects">
        Show 2-3 of your best projects with the stack used and a link. Focus on impact.
      </SkeletonSection>

      <SkeletonSection title="Skills">
        Languages: JavaScript, Python... | Frameworks: React, Node... | Tools: Git, Docker...
      </SkeletonSection>

      <SkeletonSection title="Certifications">
        AWS Certified Developer — Amazon (2024) | Winner, Smart India Hackathon (2023)
      </SkeletonSection>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-200 pt-3 text-[9.5px] tracking-wide text-zinc-300">
        <span>ATS OPTIMIZED &middot; SINGLE COLUMN &middot; NO GRAPHICS &middot; PARSER FRIENDLY</span>
        <span>RESUMINT &middot; LOCAL-ONLY</span>
      </div>
    </motion.div>
  );
}

function SkeletonSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="border-b-2 border-zinc-300 pb-1.5 text-[13.5px] font-bold uppercase tracking-widest text-zinc-400">
        {title}
      </h2>
      <p>{children}</p>
    </section>
  );
}
