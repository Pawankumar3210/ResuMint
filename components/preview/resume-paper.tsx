"use client";

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
 * SITE CHROME SIZING: every spacing utility in this file (gap-*, px-*,
 * py-*, mt-*, etc.) is written as a fixed px arbitrary value rather than
 * Tailwind's default rem-based scale, deliberately -- `rem` always
 * resolves against the root `<html>` font-size, with no way to opt an
 * element back out locally. The site chrome intentionally sets a
 * smaller root font-size (see globals.css) so the surrounding UI reads
 * more compact; without pinning this component to literal px, that same
 * change would ALSO shrink the resume's internal padding and gaps
 * (while its font sizes, already hardcoded in px for print accuracy,
 * stayed the same size) -- text and spacing drifting out of their
 * designed ratio, silently, the moment anyone touched the root
 * font-size. Pinning everything here to px makes this component's
 * rendered proportions depend only on its own literal values, exactly
 * like a real printed page's dimensions don't depend on the size of
 * the room it's sitting in.
 *
 * PAGE BREAKS: this component is one continuously-growing block of HTML
 * (see the height note on the article below) -- there's no real
 * pagination here the way there is in the PDF/DOCX exports, and (per
 * feedback) an approximated "page N starts here" marker caused more
 * confusion than it resolved, since it could never perfectly predict
 * where the PDF/DOCX's real pagination would fall. Removed; each
 * section still gets `break-inside-avoid` for actual browser printing
 * (via the existing print stylesheet), so a section won't visually
 * split across a physical page when printed, even without an on-screen
 * marker showing where that would happen.
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
    certificationsEnabled,
    achievements,
    achievementsEnabled,
    languages,
    languagesEnabled,
    declaration,
    custom,
    custom2,
    sectionOrder,
  } = resume;

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
        <div className="flex flex-col gap-[12px]">
          {education.map((e) => (
            <div key={e.id} className="flex flex-col gap-[2px]">
              <div className="flex items-baseline justify-between gap-[16px]">
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
        <div className="flex flex-col gap-[16px]">
          {experience.map((e) => (
            <div key={e.id} className="flex flex-col gap-[2px]">
              <div className="flex items-baseline justify-between gap-[16px]">
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
        <div className="flex flex-col gap-[12px]">
          {projects.map((p) => (
            <div key={p.id} className="flex flex-col gap-[2px]">
              <div className="flex items-baseline justify-between gap-[16px]">
                <p className="min-w-0 flex-1 break-words font-bold text-black">{p.name || "Project"}</p>
                <span className="shrink-0 text-right text-[9.5px] text-zinc-500 break-all">
                  {joinNonEmpty([p.githubUrl, p.liveUrl])}
                </span>
              </div>
              {p.description && <p>{p.description}</p>}
              {p.techStack?.trim() && (
                <p className="text-[10.5px] text-zinc-600">
                  <span className="font-semibold text-zinc-700">Tech Stack: </span>
                  {p.techStack}
                </p>
              )}
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
        <div className="flex flex-col gap-[4px]">
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

    certifications: () =>
      certificationsEnabled ? (
        <PlaceholderSection
          key="certifications"
          title="Certifications"
          hasContent={certifications.length > 0}
          placeholder="AWS Certified Developer — Amazon (2024)  |  Winner, Smart India Hackathon (2023)"
        >
          <div className="flex flex-col gap-[6px]">
            {certifications.map((c) => (
              <div key={c.id} className="flex items-baseline justify-between gap-[16px]">
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
      ) : null,

    achievements: () =>
      achievementsEnabled ? (
        <PlaceholderSection
          key="achievements"
          title="Achievements"
          hasContent={achievements.length > 0}
          placeholder="Add awards, honors, or competition wins."
        >
          <ul className="flex flex-col gap-[4px]">
            {achievements.map((a) => (
              <li key={a.id} className="flex gap-[8px]">
                <span aria-hidden="true">•</span>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        </PlaceholderSection>
      ) : null,

    languages: () =>
      languagesEnabled ? (
        <PlaceholderSection
          key="languages"
          title="Languages"
          hasContent={languages.length > 0}
          placeholder="e.g. English, Hindi"
        >
          <p>{languages.map((l) => l.label).join(", ")}</p>
        </PlaceholderSection>
      ) : null,

    declaration: () =>
      declaration.enabled && declaration.text.trim() ? (
        <Section key="declaration" title="Declaration">
          <p>{declaration.text}</p>
          {(declaration.showPlace || declaration.showDate || declaration.showSignature) && (
            <div
              className={`mt-[12px] flex items-end gap-[24px] ${
                (declaration.showPlace || declaration.showDate) && declaration.showSignature
                  ? "justify-between"
                  : declaration.showSignature
                    ? "justify-end"
                    : "justify-start"
              }`}
            >
              {(declaration.showPlace || declaration.showDate) && (
                <div className="flex flex-col gap-[2px] text-[10px] text-zinc-600">
                  {declaration.showPlace && <p>Place: {declaration.place || "_______________"}</p>}
                  {declaration.showDate && <p>Date: {declaration.date || "_______________"}</p>}
                </div>
              )}
              {declaration.showSignature && (
                <div className="flex w-[144px] flex-col items-center gap-[4px] text-center">
                  {declaration.showSignatureName && declaration.signatureName?.trim() ? (
                    <p className="w-full truncate font-semibold italic text-black">
                      {declaration.signatureName}
                    </p>
                  ) : (
                    <div className="h-[24px] w-full" />
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

    custom2: () =>
      custom2.enabled && (custom2.title.trim() || custom2.body.trim()) ? (
        <Section key="custom2" title={custom2.title || "Custom Section"}>
          <p className="whitespace-pre-line">{custom2.body}</p>
        </Section>
      ) : null,
  };

  return (
    <article
      className="resume-paper relative flex aspect-[210/297] w-full shrink-0 flex-col gap-[24px] px-[40px] py-[48px] font-resume text-[12px] leading-[1.6] text-zinc-800"
      style={{ fontFamily: "var(--font-resume)" }}
    >
      {/* Header -- centered per spec */}
      <header className="flex flex-col items-center gap-[6px] pb-[8px] text-center">
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
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[8px] break-inside-avoid print:break-inside-avoid">
      <h2
        className="border-b-[2px] border-black pb-[8px] text-[13px] font-bold uppercase tracking-[0.14em] text-black"
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
    <section className="flex flex-col gap-[8px] break-inside-avoid print:break-inside-avoid">
      <h2
        className="border-b-[2px] border-black pb-[8px] text-[13px] font-bold uppercase tracking-[0.14em] text-black"
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
 *  layout (text wrapping and section spacing) is always computed at --
 *  regardless of how wide the actual on-screen panel happens to be. See
 *  resume-preview.tsx's shrink-to-fit wrapper, which visually scales
 *  this fixed-width paper down (via CSS transform) to fit narrower
 *  panels WITHOUT changing its internal layout. `transform: scale()`
 *  never affects `clientWidth` or `scrollHeight` (transforms are
 *  paint-only), so as long as the article itself has a fixed width
 *  rather than a responsive one, this component's own layout stays
 *  stable no matter how the panel around it resizes. */
export const RESUME_PAPER_WIDTH_PX = 820;
