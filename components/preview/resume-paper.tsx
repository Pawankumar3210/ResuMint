"use client";

import { useEffect, useRef, useState } from "react";
import type { Resume, ReorderableSectionId, SkillCategory } from "@/types/resume";
import { SKILL_CATEGORIES } from "@/types/resume";
import { SKILL_CATEGORY_META } from "@/constants/resume-defaults";
import { formatDateRange, joinNonEmpty } from "@/utils/helpers";

/**
 * Pure, presentational renderer for a Resume, used ONLY by the live
 * on-screen preview (never by PDF/DOCX export -- those are separate
 * renderers in resume-pdf-document.tsx / docxExport.ts, so this
 * component's placeholder ghost text can never leak into a downloaded
 * file).
 *
 * Always renders the FULL resume shape. Any section/field the person
 * hasn't filled in yet shows muted example placeholder text instead of
 * disappearing -- so filling in one field never hides the rest of the
 * resume's structure. Only the specific thing being edited "becomes
 * real"; everything else keeps showing what to expect.
 *
 * Typography per spec: Times New Roman throughout, ATS-safe sizing --
 * name 20px bold, contact 9px centered, section titles 13px uppercase
 * with a border, body 12px / 1.6 line-height.
 *
 * SECTION ORDER: Personal Details is rendered as the header above,
 * unconditionally first -- it's never part of resume.sectionOrder (see
 * types/resume.ts for why). Every other section is rendered by walking
 * resume.sectionOrder and looking up its renderer in `sectionRenderers`
 * below, so the live preview always matches whatever order the person
 * set in the builder sidebar, and the PDF/DOCX exports (which walk the
 * same resume.sectionOrder) never drift from what's shown here.
 *
 * PAGE BOUNDARY MARKER: this element is one continuously-growing block
 * of HTML (see the height note on the article below) -- there's no real
 * pagination here the way there is in the PDF/DOCX exports. To still
 * give a sense of where page breaks will fall, `usePageBoundaries` below
 * measures the rendered element's actual width and total height and
 * computes where each A4-page-height multiple would land, then renders
 * a dashed marker line at each one. Crucially, this article renders at
 * a FIXED width (RESUME_PAPER_WIDTH_PX, see below) regardless of the
 * panel around it -- the panel instead scales the whole paper down
 * visually via CSS transform (see resume-preview.tsx) when it doesn't
 * fit. That keeps this component's own `clientWidth`/`scrollHeight`
 * measurements -- and therefore the marker's position -- accurate at
 * any panel size, instead of drifting whenever the panel is narrower
 * than the paper's natural width. This is purely a visual aid for
 * editing -- it has no effect on the PDF export (react-pdf paginates
 * for real) or the DOCX export (Word paginates for real); print output
 * additionally gets `break-inside-avoid` on every section below, so a
 * section won't visually split across a physical page when printed via
 * the existing print stylesheet, and the marker itself is hidden for
 * print (`print:hidden`) since it's only meaningful while editing.
 */
export function ResumePaper({ resume }: { resume: Resume }) {
  const {
    personal,
    summary,
    education,
    experience,
    projects,
    skills,
    certifications,
    achievements,
    achievementsEnabled,
    languages,
    declaration,
    custom,
    sectionOrder,
  } = resume;

  const articleRef = useRef<HTMLElement>(null);
  const pageBoundaries = usePageBoundaries(articleRef, [resume]);

  const realContact = joinNonEmpty(
    [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio],
    "  |  "
  );

  const sectionRenderers: Record<ReorderableSectionId, () => React.ReactNode> = {
    summary: () => (
      <PlaceholderSection
        key="summary"
        title="Summary"
        hasContent={summary.text.trim().length > 0}
        placeholder="Concise 3-4 line professional summary with metrics and intent. E.g. CS undergrad with X, built Y used by Z users, seeking..."
      >
        <p>{summary.text}</p>
      </PlaceholderSection>
    ),

    education: () => (
      <PlaceholderSection
        key="education"
        title="Education"
        hasContent={education.length > 0}
        placeholder="B.Tech Computer Science, VIT Vellore — Vellore, TN  |  9.1 CGPA  |  Aug 2021 – May 2025"
      >
        <div className="flex flex-col gap-3">
          {education.map((e) => (
            <div key={e.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 flex-1 break-words font-bold text-black">
                  {e.institution || "Institution"}
                  {e.degree && <span className="font-normal text-zinc-800"> — {e.degree}{e.branch ? `, ${e.branch}` : ""}</span>}
                </p>
                <span className="shrink-0 text-right text-[9.5px] text-zinc-500">
                  {formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear)}
                </span>
              </div>
              {e.grade && <p className="text-[10px] text-zinc-600">{e.grade}</p>}
            </div>
          ))}
        </div>
      </PlaceholderSection>
    ),

    experience: () => (
      <PlaceholderSection
        key="experience"
        title="Experience"
        hasContent={experience.length > 0}
        placeholder="Add internships, leadership, or work. Use bullet points starting with verbs and include numbers."
      >
        <div className="flex flex-col gap-4">
          {experience.map((e) => (
            <div key={e.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 flex-1 break-words font-bold text-black">
                  {e.role || "Role"} {e.organization && <span className="font-normal text-zinc-800">— {e.organization}</span>}
                </p>
                <span className="shrink-0 text-right text-[9.5px] text-zinc-500">
                  {formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear, e.current)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">{e.type}</p>
              {e.description && <p className="whitespace-pre-line">{e.description}</p>}
            </div>
          ))}
        </div>
      </PlaceholderSection>
    ),

    projects: () => (
      <PlaceholderSection
        key="projects"
        title="Projects"
        hasContent={projects.length > 0}
        placeholder="Show 2-3 of your best projects with the stack used and a link. Focus on impact."
      >
        <div className="flex flex-col gap-3">
          {projects.map((p) => (
            <div key={p.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="min-w-0 flex-1 break-words font-bold text-black">{p.name || "Project"}</p>
                <span className="shrink-0 text-right text-[9.5px] text-zinc-500 break-all">
                  {joinNonEmpty([p.githubUrl, p.liveUrl])}
                </span>
              </div>
              {p.description && <p>{p.description}</p>}
            </div>
          ))}
        </div>
      </PlaceholderSection>
    ),

    skills: () => (
      <PlaceholderSection
        key="skills"
        title="Skills"
        hasContent={skills.length > 0}
        placeholder="Languages: JavaScript, Python...  |  Frameworks: React, Node...  |  Tools: Git, Docker..."
      >
        <div className="flex flex-col gap-1">
          {SKILL_CATEGORIES.map((category: SkillCategory) => {
            const items = skills.filter((s) => s.category === category);
            if (items.length === 0) return null;
            return (
              <p key={category}>
                <span className="font-bold text-black">{SKILL_CATEGORY_META[category].label}: </span>
                {items.map((s) => s.label).join(", ")}
              </p>
            );
          })}
        </div>
      </PlaceholderSection>
    ),

    certifications: () => (
      <PlaceholderSection
        key="certifications"
        title="Certifications"
        hasContent={certifications.length > 0}
        placeholder="AWS Certified Developer — Amazon (2024)  |  Winner, Smart India Hackathon (2023)"
      >
        <div className="flex flex-col gap-1.5">
          {certifications.map((c) => (
            <div key={c.id} className="flex items-baseline justify-between gap-4">
              <p className="min-w-0 flex-1 break-words font-bold text-black">
                {c.name || "Certification"}
                {c.organization && <span className="font-normal text-zinc-800"> — {c.organization}</span>}
              </p>
              <span className="shrink-0 text-right text-[9.5px] text-zinc-500">
                {joinNonEmpty([c.month, c.year])}
              </span>
            </div>
          ))}
        </div>
      </PlaceholderSection>
    ),

    achievements: () =>
      achievementsEnabled ? (
        <PlaceholderSection
          key="achievements"
          title="Achievements"
          hasContent={achievements.length > 0}
          placeholder="Add awards, honors, or competition wins."
        >
          <ul className="flex flex-col gap-1">
            {achievements.map((a) => (
              <li key={a.id} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </PlaceholderSection>
      ) : null,

    languages: () => (
      <PlaceholderSection
        key="languages"
        title="Languages"
        hasContent={languages.length > 0}
        placeholder="e.g. English, Hindi"
      >
        <p>{languages.map((l) => l.label).join(", ")}</p>
      </PlaceholderSection>
    ),

    declaration: () =>
      declaration.enabled && declaration.text.trim() ? (
        <Section key="declaration" title="Declaration">
          <p>{declaration.text}</p>
          {(declaration.showPlace || declaration.showDate || declaration.showSignature) && (
            <div
              className={`mt-3 flex items-end gap-6 ${
                (declaration.showPlace || declaration.showDate) && declaration.showSignature
                  ? "justify-between"
                  : declaration.showSignature
                    ? "justify-end"
                    : "justify-start"
              }`}
            >
              {(declaration.showPlace || declaration.showDate) && (
                <div className="flex flex-col gap-0.5 text-[10px] text-zinc-600">
                  {declaration.showPlace && <p>Place: {declaration.place || "_______________"}</p>}
                  {declaration.showDate && <p>Date: {declaration.date || "_______________"}</p>}
                </div>
              )}
              {declaration.showSignature && (
                <div className="flex w-36 flex-col items-center gap-1 text-center">
                  {declaration.showSignatureName && declaration.signatureName?.trim() ? (
                    <p className="w-full truncate font-semibold italic text-black">
                      {declaration.signatureName}
                    </p>
                  ) : (
                    <div className="h-6 w-full" />
                  )}
                  <div className="w-full border-t border-black/50" />
                  <p className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">Signature</p>
                </div>
              )}
            </div>
          )}
        </Section>
      ) : null,

    custom: () =>
      custom.enabled && (custom.title.trim() || custom.body.trim()) ? (
        <Section key="custom" title={custom.title || "Custom Section"}>
          <p className="whitespace-pre-line">{custom.body}</p>
        </Section>
      ) : null,
  };

  return (
    <article
      ref={articleRef}
      className="resume-paper relative flex aspect-[210/297] w-full shrink-0 flex-col gap-6 px-10 py-12 font-resume text-[12px] leading-[1.6] text-zinc-800"
      style={{ fontFamily: "var(--font-resume)" }}
    >
      {/* Header -- centered per spec */}
      <header className="flex flex-col items-center gap-1.5 pb-2 text-center">
        <PlaceholderText
          as="h1"
          value={personal.fullName}
          placeholder="Your Full Name"
          transform="uppercase"
          className="text-[20px] font-bold tracking-[-0.02em]"
          placeholderClassName="text-zinc-400"
          realClassName="text-black"
        />
        <PlaceholderText
          value={realContact}
          placeholder="email  |  phone  |  linkedin  |  github  |  location"
          className="text-[9px]"
          placeholderClassName="text-zinc-400"
          realClassName="text-zinc-600"
        />
      </header>

      {sectionOrder.map((id) => sectionRenderers[id]())}

      {/* Page-boundary markers -- screen only, purely informational (see
          module docstring). Absolutely positioned against this article
          (which has no overflow-hidden), so they're never clipped.
          Solid, fully-opaque rose-600 (not a translucent rose-400/70) on
          both the line and the label chip -- .resume-paper's background
          is always solid white regardless of the site's light/dark
          theme (see color-scheme:light above), so a semi-transparent
          line's effective contrast could vary with whatever renders
          underneath it; a solid, unambiguous color reads the same
          every time, in either theme, at a glance. Thicker (2px, not
          1px) for the same reason -- easier to spot at standard preview
          zoom levels without hunting for a hairline. */}
      {pageBoundaries.map((top, i) => (
        <div
          key={top}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10 print:hidden"
          style={{ top }}
        >
          <div className="border-t-2 border-dashed border-rose-600" />
          <span className="absolute right-0 top-0 -translate-y-full whitespace-nowrap rounded-sm bg-rose-600 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white">
            Page {i + 2} starts here
          </span>
        </div>
      ))}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 break-inside-avoid print:break-inside-avoid">
      <h2
        className="border-b-[2px] border-black pb-2 text-[13px] font-bold uppercase tracking-[0.14em] text-black"
        style={{ borderBottomColor: "#000000", borderBottomWidth: "2px", borderBottomStyle: "solid" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The core of the "hybrid" preview: renders real content in normal
 * (dark) styling if present, or a muted example placeholder in the same
 * position/structure if not -- so the section is always visible, and
 * only its actual content state changes.
 */
function PlaceholderSection({
  title,
  hasContent,
  placeholder,
  children,
}: {
  title: string;
  hasContent: boolean;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 break-inside-avoid print:break-inside-avoid">
      <h2
        className="border-b-[2px] border-black pb-2 text-[13px] font-bold uppercase tracking-[0.14em] text-black"
        style={{ borderBottomColor: "#000000", borderBottomWidth: "2px", borderBottomStyle: "solid" }}
      >
        {title}
      </h2>
      {hasContent ? children : <p className="text-zinc-400">{placeholder}</p>}
    </section>
  );
}

/** Field-level real-or-placeholder text, used in the header where name
 *  and contact line need their own independent real/placeholder state
 *  rather than the whole section swapping at once. */
function PlaceholderText({
  value,
  placeholder,
  className,
  placeholderClassName,
  realClassName,
  transform,
  as: Tag = "p",
}: {
  value: string;
  placeholder: string;
  className?: string;
  placeholderClassName?: string;
  realClassName?: string;
  transform?: "uppercase";
  as?: "p" | "h1";
}) {
  const hasValue = value.trim().length > 0;
  const text = hasValue ? value : placeholder;
  return (
    <Tag
      className={[className, hasValue ? realClassName : placeholderClassName, transform].filter(Boolean).join(" ")}
    >
      {text}
    </Tag>
  );
}

/** Fixed design width, in CSS px, that the resume paper's internal
 *  layout (text wrapping, section spacing, and the page-boundary
 *  measurement below) is always computed at -- regardless of how wide
 *  the actual on-screen panel happens to be. See resume-preview.tsx's
 *  shrink-to-fit wrapper, which visually scales this fixed-width paper
 *  down (via CSS transform) to fit narrower panels WITHOUT changing its
 *  internal layout. This is what keeps the page-boundary marker below
 *  accurate: `transform: scale()` never affects `clientWidth` or
 *  `scrollHeight` (transforms are paint-only), so as long as the article
 *  itself has a fixed width rather than a responsive one, this
 *  component's own measurements stay stable and correct no matter how
 *  the panel around it resizes. Previously this was a responsive
 *  `w-full max-w-[820px]`, which let a narrower panel force extra text
 *  wrapping (taller content) while ALSO shrinking the computed
 *  page-height threshold -- a compounding bug that made the marker fire
 *  far too early on anything less than a full-width panel. */
export const RESUME_PAPER_WIDTH_PX = 820;

/** A4's height:width ratio (297mm / 210mm) -- matches the `aspect-[210/297]`
 *  class on the article above, which only governs the box's height when
 *  content is short enough to fit; once content overflows that single-page
 *  aspect ratio, the flex column just keeps growing taller (this element
 *  intentionally has no fixed height/overflow -- see module docstring),
 *  which is what makes it "one continuous scroll" in the first place. */
const A4_ASPECT_RATIO = 297 / 210;

/**
 * Measures the resume-paper element's actual rendered width and total
 * (scroll) height, then returns the list of `top` pixel offsets at which
 * each A4 page boundary would fall -- i.e. one entry per page break after
 * the first page. Recomputes on resize (responsive width) and whenever
 * `deps` changes (new content can grow the element's height without its
 * width changing, which a ResizeObserver on this same element also
 * reports, but `deps` covers the very first paint after a fast content
 * change more reliably than waiting on the observer callback).
 */
function usePageBoundaries(ref: React.RefObject<HTMLElement | null>, deps: unknown[]): number[] {
  const [boundaries, setBoundaries] = useState<number[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const width = el.clientWidth;
      const totalHeight = el.scrollHeight;
      if (!width || !totalHeight) {
        setBoundaries([]);
        return;
      }
      const pageHeight = width * A4_ASPECT_RATIO;
      // Only interior boundaries -- if content fits on one page there are
      // none; a small epsilon avoids a spurious marker landing exactly on
      // (or a fraction of a pixel before) the element's own bottom edge.
      const pageCount = Math.floor(totalHeight / pageHeight - 0.01) + 1;
      const next: number[] = [];
      for (let page = 1; page < pageCount; page++) {
        next.push(Math.round(pageHeight * page));
      }
      setBoundaries(next);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);

  return boundaries;
}
