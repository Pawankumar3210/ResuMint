"use client";

import type { Resume, ReorderableSectionId } from "@/types/resume";
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
    summaryEnabled,
    education,
    educationEnabled,
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
    custom3,
    sectionOrder,
    onePageFit,
  } = resume;

  // Compact spacing values for 1-page fit mode -- mirrors the PDF
  // renderer's "compact" style set so the preview is an accurate proxy.
  const fit = onePageFit;
  const isModern = resume.template === "modern";

  // Compact spacing values for 1-page fit mode -- mirrors the PDF
  // renderer's "compact" style set so the preview is an accurate proxy.
  const articleClass = isModern
    ? fit
      ? "resume-paper relative flex aspect-[210/297] w-full shrink-0 flex-col gap-[12px] px-[32px] py-[28px] font-sans text-[10px] leading-[1.45] text-zinc-800"
      : "resume-paper relative flex aspect-[210/297] w-full shrink-0 flex-col gap-[16px] px-[36px] py-[38px] font-sans text-[11px] leading-[1.55] text-zinc-800"
    : fit
      ? "resume-paper relative flex aspect-[210/297] w-full shrink-0 flex-col gap-[14px] px-[36px] py-[36px] font-resume text-[10.5px] leading-[1.5] text-zinc-800"
      : "resume-paper relative flex aspect-[210/297] w-full shrink-0 flex-col gap-[24px] px-[40px] py-[48px] font-resume text-[12px] leading-[1.6] text-zinc-800";

  const sectionGap = isModern
    ? fit ? "gap-[5px]" : "gap-[6px]"
    : fit ? "gap-[6px]" : "gap-[8px]";
  const entryGap = isModern
    ? fit ? "gap-[8px]" : "gap-[10px]"
    : fit ? "gap-[10px]" : "gap-[12px]";
  const entryInnerGap = fit ? "gap-[1px]" : "gap-[2px]";
  const bodyEntryGap = isModern
    ? fit ? "gap-[10px]" : "gap-[13px]"
    : fit ? "gap-[12px]" : "gap-[16px]";
  const skillGap = isModern
    ? fit ? "gap-[3px]" : "gap-[4px]"
    : fit ? "gap-[3px]" : "gap-[4px]";
  const certGap = isModern
    ? fit ? "gap-[3px]" : "gap-[4px]"
    : fit ? "gap-[4px]" : "gap-[6px]";
  const headerGap = fit ? "gap-[4px]" : "gap-[6px]";
  const nameFontClass = fit ? "text-[17px]" : "text-[20px]";
  const contactFontClass = fit ? "text-[8px]" : "text-[9px]";
  const sectionTitleClass = isModern
    ? fit
      ? "border-b border-zinc-900 pb-[3px] text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-950"
      : "border-b border-zinc-900 pb-[4px] text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-950"
    : fit
      ? "border-b-[2px] border-black pb-[5px] text-[11.5px] font-bold uppercase tracking-[0.14em] text-black"
      : "border-b-[2px] border-black pb-[8px] text-[13px] font-bold uppercase tracking-[0.14em] text-black";
  const dateClass = fit ? "shrink-0 text-right text-[8.5px] text-zinc-500" : "shrink-0 text-right text-[9.5px] text-zinc-500";
  const gradeClass = fit ? "text-[9px] text-zinc-600" : "text-[10px] text-zinc-600";
  const expTypeClass = fit ? "text-[9px] text-zinc-500" : "text-[10px] text-zinc-500";
  const techStackClass = fit ? "text-[9.5px] text-zinc-600" : "text-[10.5px] text-zinc-600";
  const skillLabelClass = fit ? "text-[9.5px]" : "text-[10px]";
  const sigClass = fit ? "text-[8px]" : "text-[9px]";
  const headerPbClass = fit ? "pb-[6px]" : "pb-[8px]";
  const decSignatureGap = fit ? "mt-[8px]" : "mt-[12px]";
  const decSignatureWidth = fit ? "w-[120px]" : "w-[144px]";
  const decSignatureSpacer = fit ? "h-[18px]" : "h-[24px]";

  const SIDEBAR_SECTIONS = new Set<ReorderableSectionId>([
    "education",
    "skills",
    "certifications",
    "languages",
  ]);
  // In modern two-column layout, custom sections can be placed in either
  // the left sidebar or the right main column.
  if (custom.column === "left") SIDEBAR_SECTIONS.add("custom");
  if (custom2.column === "left") SIDEBAR_SECTIONS.add("custom2");
  if (custom3.column === "left") SIDEBAR_SECTIONS.add("custom3");

  const sidebarOrder = sectionOrder.filter((id) => SIDEBAR_SECTIONS.has(id));
  const mainOrder = sectionOrder.filter((id) => !SIDEBAR_SECTIONS.has(id));

  const realContact = joinNonEmpty(
    [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio],
    isModern ? "  •  " : "  |  "
  );

  const sectionRenderers: Record<ReorderableSectionId, () => React.ReactNode> = {
    summary: () =>
      summaryEnabled ? (
        <PlaceholderSection
          key="summary"
          title="Professional Summary"
          hasContent={summary.text.trim().length > 0}
          placeholder="Concise 3-4 line professional summary with metrics and intent. E.g. CS undergrad with X, built Y used by Z users, seeking..."
          sectionGap={sectionGap}
          sectionTitleClass={sectionTitleClass}
        >
          <p>{summary.text}</p>
        </PlaceholderSection>
      ) : null,

    education: () =>
      educationEnabled ? (
        <PlaceholderSection
          key="education"
          title="Education"
          hasContent={education.length > 0}
          placeholder="B.Tech Computer Science, VIT Vellore — Vellore, TN  |  9.1 CGPA  |  Aug 2021 – May 2025"
          sectionGap={sectionGap}
          sectionTitleClass={sectionTitleClass}
        >
          <div className={`flex flex-col ${entryGap}`}>
            {education.map((e) => (
              <div key={e.id} className={`flex flex-col ${entryInnerGap}`}>
                {isModern ? (
                  <>
                    <p className="min-w-0 font-bold text-zinc-950 text-[10px] leading-tight">
                      {e.degree || "Degree"}
                      {e.branch && <span className="font-medium text-zinc-700">, {e.branch}</span>}
                    </p>
                    <p className="min-w-0 text-zinc-700 font-medium text-[9px]">
                      {e.institution || "Institution"}
                    </p>
                    <div className="flex items-baseline justify-between gap-1 text-[8px] text-zinc-500">
                      <span>{formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear)}</span>
                      {e.grade && <span className="font-medium text-zinc-600">{e.grade}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-[16px]">
                      <p className="min-w-0 flex-1 break-words font-bold text-black">
                        {e.institution || "Institution"}
                        {e.degree && <span className="font-normal text-zinc-800"> — {e.degree}{e.branch ? `, ${e.branch}` : ""}</span>}
                      </p>
                      <span className={dateClass}>
                        {formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear)}
                      </span>
                    </div>
                    {e.grade && <p className={gradeClass}>{e.grade}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        </PlaceholderSection>
      ) : null,

    experience: () => (
      <PlaceholderSection
        key="experience"
        title="Experience"
        hasContent={experience.length > 0}
        placeholder="Add internships, leadership, or work. Use bullet points starting with verbs and include numbers."
        sectionGap={sectionGap}
        sectionTitleClass={sectionTitleClass}
      >
        <div className={`flex flex-col ${bodyEntryGap}`}>
          {experience.map((e) => (
            <div key={e.id} className={`flex flex-col ${entryInnerGap}`}>
              <div className="flex items-baseline justify-between gap-[16px]">
                <p className="min-w-0 flex-1 break-words font-bold text-black">
                  {e.role || "Role"} {e.organization && <span className="font-normal text-zinc-800">— {e.organization}</span>}
                </p>
                <span className={dateClass}>
                  {formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear, e.current)}
                </span>
              </div>
              <p className={expTypeClass}>{e.type}</p>
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
        sectionGap={sectionGap}
        sectionTitleClass={sectionTitleClass}
      >
        <div className={`flex flex-col ${entryGap}`}>
          {projects.map((p) => (
            <div key={p.id} className={`flex flex-col ${entryInnerGap}`}>
              <div className="flex items-baseline justify-between gap-[16px]">
                <p className="min-w-0 flex-1 break-words font-bold text-black">{p.name || "Project"}</p>
                <span className={`shrink-0 text-right break-all ${dateClass}`}>
                  {joinNonEmpty([p.githubUrl, p.liveUrl])}
                </span>
              </div>
              {p.description && <p>{p.description}</p>}
              {p.techStack?.trim() && (
                <p className={techStackClass}>
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
        sectionGap={sectionGap}
        sectionTitleClass={sectionTitleClass}
      >
        <div className={`flex flex-col ${skillGap}`}>
          {(resume.skillCategories ?? []).map((cat) => {
            const items = skills.filter((s) => s.category === cat.id);
            if (items.length === 0) return null;
            // Fall back to SKILL_CATEGORY_META for the four built-in categories.
            const label = cat.label;
            return isModern ? (
              <div key={cat.id} className="flex flex-col">
                <span className="font-semibold text-zinc-950 text-[9.5px]">
                  {label}
                </span>
                <span className={`${skillLabelClass} text-zinc-700 leading-snug`}>
                  {items.map((s) => s.label).join(", ")}
                </span>
              </div>
            ) : (
              <p key={cat.id} className={skillLabelClass}>
                <span className="font-bold text-black">{label}: </span>
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
          sectionGap={sectionGap}
          sectionTitleClass={sectionTitleClass}
        >
          <div className={`flex flex-col ${certGap}`}>
            {certifications.map((c) => (
              <div key={c.id} className="flex flex-col">
                {isModern ? (
                  <>
                    <p className="min-w-0 font-bold text-zinc-950 text-[9.5px] leading-tight">
                      {c.name || "Certification"}
                    </p>
                    <div className="flex items-baseline justify-between gap-1 text-[8px] text-zinc-500">
                      <span>{c.organization}</span>
                      <span>{joinNonEmpty([c.month, c.year])}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-baseline justify-between gap-[16px]">
                    <p className="min-w-0 flex-1 break-words font-bold text-black">
                      {c.name || "Certification"}
                      {c.organization && <span className="font-normal text-zinc-800"> — {c.organization}</span>}
                    </p>
                    <span className={dateClass}>
                      {joinNonEmpty([c.month, c.year])}
                    </span>
                  </div>
                )}
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
          sectionGap={sectionGap}
          sectionTitleClass={sectionTitleClass}
        >
          <ul className={`flex flex-col ${skillGap}`}>
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
          sectionGap={sectionGap}
          sectionTitleClass={sectionTitleClass}
        >
          <p>{languages.map((l) => l.label).join(", ")}</p>
        </PlaceholderSection>
      ) : null,

    declaration: () =>
      declaration.enabled && declaration.text.trim() ? (
        <Section key="declaration" title="Declaration" sectionGap={sectionGap} sectionTitleClass={sectionTitleClass}>
          <p>{declaration.text}</p>
          {(declaration.showPlace || declaration.showDate || declaration.showSignature) && (
            <div
              className={`${decSignatureGap} flex items-end gap-[24px] ${
                (declaration.showPlace || declaration.showDate) && declaration.showSignature
                  ? "justify-between"
                  : declaration.showSignature
                    ? "justify-end"
                    : "justify-start"
              }`}
            >
              {(declaration.showPlace || declaration.showDate) && (
                <div className={`flex flex-col gap-[2px] ${gradeClass}`}>
                  {declaration.showPlace && <p>Place: {declaration.place || "_______________"}</p>}
                  {declaration.showDate && <p>Date: {declaration.date || "_______________"}</p>}
                </div>
              )}
              {declaration.showSignature && (
                <div className={`flex ${decSignatureWidth} flex-col items-center gap-[4px] text-center`}>
                  {declaration.showSignatureName && declaration.signatureName?.trim() ? (
                    <p className="w-full truncate font-semibold italic text-black">
                      {declaration.signatureName}
                    </p>
                  ) : (
                    <div className={`${decSignatureSpacer} w-full`} />
                  )}
                  <div className="w-full border-t border-black/50" />
                  <p className={`${sigClass} uppercase tracking-[0.12em] text-zinc-500`}>Signature</p>
                </div>
              )}
            </div>
          )}
        </Section>
      ) : null,

    custom: () =>
      custom.enabled && (custom.title.trim() || custom.body.trim()) ? (
        <Section key="custom" title={custom.title || "Custom Section"} sectionGap={sectionGap} sectionTitleClass={sectionTitleClass}>
          <p className="whitespace-pre-line">{custom.body}</p>
        </Section>
      ) : null,

    custom2: () =>
      custom2.enabled && (custom2.title.trim() || custom2.body.trim()) ? (
        <Section key="custom2" title={custom2.title || "Custom Section 2"} sectionGap={sectionGap} sectionTitleClass={sectionTitleClass}>
          <p className="whitespace-pre-line">{custom2.body}</p>
        </Section>
      ) : null,

    custom3: () =>
      custom3.enabled && (custom3.title.trim() || custom3.body.trim()) ? (
        <Section key="custom3" title={custom3.title || "Custom Section 3"} sectionGap={sectionGap} sectionTitleClass={sectionTitleClass}>
          <p className="whitespace-pre-line">{custom3.body}</p>
        </Section>
      ) : null,
  };

  return (
    <article
      className={articleClass}
      style={{
        fontFamily: isModern
          ? "var(--font-sans), ui-sans-serif, system-ui, sans-serif"
          : "var(--font-resume)",
      }}
    >
      {/* Header -- full-width for both per user selection */}
      {isModern ? (
        <header className="flex flex-col gap-1 pb-2.5 border-b border-zinc-300">
          <PlaceholderText
            as="h1"
            value={personal.fullName}
            placeholder="YOUR FULL NAME"
            transform="uppercase"
            className={`${fit ? "text-[18px]" : "text-[21px]"} font-extrabold tracking-tight text-zinc-950`}
            placeholderClassName="text-zinc-400"
            realClassName="text-zinc-950"
          />
          <PlaceholderText
            value={realContact}
            placeholder="email  •  phone  •  linkedin  •  github  •  location"
            className={`${fit ? "text-[8px]" : "text-[9px]"} text-zinc-600 font-medium`}
            placeholderClassName="text-zinc-400"
            realClassName="text-zinc-600"
          />
        </header>
      ) : (
        <header className={`flex flex-col items-center ${headerGap} ${headerPbClass} text-center`}>
          <PlaceholderText
            as="h1"
            value={personal.fullName}
            placeholder="Your Full Name"
            transform="uppercase"
            className={`${nameFontClass} font-bold tracking-[-0.02em]`}
            placeholderClassName="text-zinc-400"
            realClassName="text-black"
          />
          <PlaceholderText
            value={realContact}
            placeholder="email  |  phone  |  linkedin  |  github  |  location"
            className={contactFontClass}
            placeholderClassName="text-zinc-400"
            realClassName="text-zinc-600"
          />
        </header>
      )}

      {isModern ? (
        <div className={`flex ${fit ? "gap-[16px]" : "gap-[22px]"} w-full flex-1`}>
          {/* Left Column (Sidebar: Education, Skills, Certifications, Languages, Declaration) */}
          <div className={`w-[34%] shrink-0 flex flex-col ${fit ? "gap-[10px]" : "gap-[14px]"}`}>
            {sidebarOrder.map((id) => sectionRenderers[id]())}
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] bg-zinc-200 self-stretch shrink-0" />

          {/* Right Column (Main: Summary, Experience, Projects, Achievements, Custom) */}
          <div className={`flex-1 min-w-0 flex flex-col ${fit ? "gap-[10px]" : "gap-[14px]"}`}>
            {mainOrder.map((id) => sectionRenderers[id]())}
          </div>
        </div>
      ) : (
        sectionOrder.map((id) => sectionRenderers[id]())
      )}
    </article>
  );
}

function Section({
  title,
  children,
  sectionGap = "gap-[8px]",
  sectionTitleClass = "border-b-[2px] border-black pb-[8px] text-[13px] font-bold uppercase tracking-[0.14em] text-black",
}: {
  title: string;
  children: React.ReactNode;
  sectionGap?: string;
  sectionTitleClass?: string;
}) {
  return (
    <section className={`flex flex-col ${sectionGap} break-inside-avoid print:break-inside-avoid`}>
      <h2 className={sectionTitleClass}>
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
  sectionGap = "gap-[8px]",
  sectionTitleClass = "border-b-[2px] border-black pb-[8px] text-[13px] font-bold uppercase tracking-[0.14em] text-black",
}: {
  title: string;
  hasContent: boolean;
  placeholder: string;
  children: React.ReactNode;
  sectionGap?: string;
  sectionTitleClass?: string;
}) {
  return (
    <section className={`flex flex-col ${sectionGap} break-inside-avoid print:break-inside-avoid`}>
      <h2 className={sectionTitleClass}>
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
