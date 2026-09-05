import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { Resume, ReorderableSectionId } from "@/types/resume";
import { SKILL_CATEGORIES } from "@/types/resume";
import type { PageLayout } from "@/types/export";
import { SKILL_CATEGORY_META } from "@/constants/resume-defaults";
import { formatDateRange, joinNonEmpty } from "@/utils/helpers";

// react-pdf's hyphenation engine assumes justified text; disabling it
// keeps word breaks natural (matching the unjustified live preview).
Font.registerHyphenationCallback((word) => [word]);

/**
 * Mirrors ResumePaper's section-by-section data mapping, but targets
 * @react-pdf/renderer's own primitives (Text/View, not DOM) since PDF
 * generation can't reuse regular HTML. Kept as close to ResumePaper's
 * structure and section order as possible so the two never drift far
 * apart. Produces real selectable text -- no rasterized/image text,
 * which is what keeps this ATS-safe.
 *
 * `layout="one"` uses tighter type/spacing to encourage fitting on a
 * single physical page. This is a best-effort compaction, not a hard
 * guarantee -- a resume with a very large amount of content can still
 * spill onto a second page even in "one page" mode, the same tradeoff
 * every resume tool with a free-text builder has to make.
 *
 * SECTION ORDER: the header (name/contact, from resume.personal) is
 * always first, same as ResumePaper -- "personal" is never part of
 * resume.sectionOrder. Every other section is produced by walking
 * resume.sectionOrder and calling its renderer in `sectionRenderers`,
 * so a real page-by-page PDF always matches whatever order the person
 * set in the builder sidebar and sees in the live preview.
 *
 * PAGE BREAKS: each Section now renders with `wrap={false}` (react-pdf's
 * "don't split this View across a page boundary" flag), so a whole
 * section moves to the next page together rather than being cut half on
 * page 1 / half on page 2. Individual entries inside a section already
 * used `wrap={false}` for the same reason. The tradeoff: a single
 * section taller than one physical page can still overflow visually --
 * an unavoidable limit of "don't split," not a bug, and consistent with
 * the "best-effort" framing above.
 */
export function ResumePdfDocument({ resume, layout }: { resume: Resume; layout: PageLayout }) {
  const s = layout === "one" ? styles.compact : styles.normal;
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
    leadership,
    languages,
    interests,
    declaration,
    custom,
    sectionOrder,
  } = resume;

  const contactLine = joinNonEmpty(
    [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio],
    "  |  "
  );

  const sectionRenderers: Record<ReorderableSectionId, () => React.ReactNode> = {
    summary: () =>
      summary.text.trim() ? (
        <Section key="summary" title="Professional Summary" s={s}>
          <Text style={s.body}>{summary.text}</Text>
        </Section>
      ) : null,

    education: () =>
      education.length > 0 ? (
        <Section key="education" title="Education" s={s}>
          {education.map((e) => (
            <View key={e.id} style={s.entry} wrap={false}>
              <View style={base.entryHeadRow}>
                <Text style={s.entryTitle}>
                  {e.institution || "Institution"}
                  {e.degree ? ` — ${e.degree}${e.branch ? `, ${e.branch}` : ""}` : ""}
                </Text>
                <Text style={s.entryDate}>
                  {formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear)}
                </Text>
              </View>
              {e.grade && <Text style={s.entrySub}>{e.grade}</Text>}
            </View>
          ))}
        </Section>
      ) : null,

    experience: () =>
      experience.length > 0 ? (
        <Section key="experience" title="Experience" s={s}>
          {experience.map((e) => (
            <View key={e.id} style={s.entry} wrap={false}>
              <View style={base.entryHeadRow}>
                <Text style={s.entryTitle}>
                  {e.role || "Role"}
                  {e.organization ? ` — ${e.organization}` : ""}
                </Text>
                <Text style={s.entryDate}>
                  {formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear, e.current)}
                </Text>
              </View>
              <Text style={s.entrySub}>{e.type}</Text>
              {e.description && <Text style={s.body}>{e.description}</Text>}
            </View>
          ))}
        </Section>
      ) : null,

    projects: () =>
      projects.length > 0 ? (
        <Section key="projects" title="Projects" s={s}>
          {projects.map((p) => (
            <View key={p.id} style={s.entry} wrap={false}>
              <View style={base.entryHeadRow}>
                <Text style={s.entryTitle}>{p.name || "Project"}</Text>
                {(p.githubUrl || p.liveUrl) && (
                  <Text style={s.entryDate}>{joinNonEmpty([p.githubUrl, p.liveUrl])}</Text>
                )}
              </View>
              {p.description && <Text style={s.body}>{p.description}</Text>}
            </View>
          ))}
        </Section>
      ) : null,

    skills: () =>
      skills.length > 0 ? (
        <Section key="skills" title="Skills" s={s}>
          {SKILL_CATEGORIES.map((category) => {
            const items = skills.filter((sk) => sk.category === category);
            if (items.length === 0) return null;
            return (
              <Text key={category} style={s.body}>
                <Text style={s.entryTitle}>{SKILL_CATEGORY_META[category].label}: </Text>
                {items.map((sk) => sk.label).join(", ")}
              </Text>
            );
          })}
        </Section>
      ) : null,

    certifications: () =>
      certifications.length > 0 ? (
        <Section key="certifications" title="Certifications" s={s}>
          {certifications.map((c) => (
            <View key={c.id} style={base.entryHeadRow} wrap={false}>
              <Text style={s.entryTitle}>
                {c.name || "Certification"}
                {c.organization ? <Text style={s.body}> — {c.organization}</Text> : null}
              </Text>
              <Text style={s.entryDate}>{joinNonEmpty([c.month, c.year])}</Text>
            </View>
          ))}
        </Section>
      ) : null,

    achievements: () =>
      achievementsEnabled && achievements.length > 0 ? (
        <Section key="achievements" title="Achievements" s={s}>
          {achievements.map((a) => (
            <Text key={a.id} style={s.bullet}>
              •  {a.text}
            </Text>
          ))}
        </Section>
      ) : null,

    leadership: () =>
      leadership.length > 0 ? (
        <Section key="leadership" title="Leadership" s={s}>
          {leadership.map((l) => (
            <View key={l.id} style={s.entry} wrap={false}>
              <View style={base.entryHeadRow}>
                <Text style={s.entryTitle}>
                  {l.role || "Role"}
                  {l.organization ? ` — ${l.organization}` : ""}
                </Text>
                <Text style={s.entryDate}>
                  {formatDateRange(l.startMonth, l.startYear, l.endMonth, l.endYear)}
                </Text>
              </View>
              {l.description && <Text style={s.body}>{l.description}</Text>}
            </View>
          ))}
        </Section>
      ) : null,

    languages: () =>
      languages.length > 0 ? (
        <Section key="languages" title="Languages" s={s}>
          <Text style={s.body}>{languages.map((l) => l.label).join(", ")}</Text>
        </Section>
      ) : null,

    interests: () =>
      interests.length > 0 ? (
        <Section key="interests" title="Interests" s={s}>
          <Text style={s.body}>{interests.map((i) => i.label).join(", ")}</Text>
        </Section>
      ) : null,

    declaration: () =>
      declaration.enabled && declaration.text.trim() ? (
        <Section key="declaration" title="Declaration" s={s}>
          <Text style={s.body}>{declaration.text}</Text>
          {(declaration.showPlace || declaration.showDate || declaration.showSignature) && (
            <View
              style={[
                base.signatureRow,
                {
                  justifyContent:
                    (declaration.showPlace || declaration.showDate) && declaration.showSignature
                      ? "space-between"
                      : declaration.showSignature
                        ? "flex-end"
                        : "flex-start",
                },
              ]}
            >
              {(declaration.showPlace || declaration.showDate) && (
                <View>
                  {declaration.showPlace && (
                    <Text style={s.entrySub}>Place: {declaration.place || "_______________"}</Text>
                  )}
                  {declaration.showDate && (
                    <Text style={s.entrySub}>Date: {declaration.date || "_______________"}</Text>
                  )}
                </View>
              )}
              {declaration.showSignature && (
                <View style={base.signatureBlock}>
                  {declaration.showSignatureName && declaration.signatureName?.trim() ? (
                    <Text style={s.signatureName}>{declaration.signatureName}</Text>
                  ) : (
                    <View style={base.signatureSpacer} />
                  )}
                  <View style={base.signatureLine} />
                  <Text style={s.signatureLabel}>Signature</Text>
                </View>
              )}
            </View>
          )}
        </Section>
      ) : null,

    custom: () =>
      custom.enabled && (custom.title.trim() || custom.body.trim()) ? (
        <Section key="custom" title={custom.title || "Custom Section"} s={s}>
          <Text style={s.body}>{custom.body}</Text>
        </Section>
      ) : null,
  };

  return (
    <Document title={`${personal.fullName || "Resume"} — Resume`} author={personal.fullName || undefined}>
      <Page size="A4" style={[base.page, s.page]} wrap>
        <View style={base.header}>
          <Text style={s.name}>{personal.fullName || "Your Name"}</Text>
          {contactLine && <Text style={s.contact}>{contactLine}</Text>}
        </View>

        {sectionOrder.map((id) => sectionRenderers[id]())}
      </Page>
    </Document>
  );
}

function Section({ title, s, children }: { title: string; s: typeof styles.normal; children: React.ReactNode }) {
  return (
    // NOT wrap={false} here. A section containing many entries (e.g.
    // ten jobs of experience) can legitimately be taller than a single
    // physical page, and react-pdf has no fallback for an unsplittable
    // node that doesn't fit: it silently drops/truncates the overflow
    // instead of raising an error, which for a while made resumes with
    // enough content quietly lose their tail end with no visible
    // warning. Each entry inside a section already gets its own
    // `wrap={false}` (see below), which is the actual guarantee we
    // want -- no single job/project/entry gets visually cut in half --
    // while still letting a long section flow across a page boundary
    // between entries, the same way a real multi-page document would.
    <View style={s.section} minPresenceAhead={40}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const base = StyleSheet.create({
  page: { fontFamily: "Times-Roman", color: "#27272a" },
  header: {
    marginBottom: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  entryHeadRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 14,
    gap: 24,
  },
  signatureBlock: { alignItems: "center", minWidth: 130 },
  signatureSpacer: { height: 20 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#999999", width: "100%", marginTop: 4 },
});

// Two variants: "normal" (two-page-friendly) and "compact" (one-page target).
// Times-Roman/Times-Bold are react-pdf's built-in standard serif fonts (no
// embedding needed), matching the live preview's Times New Roman styling.
const shared = {
  name: { fontFamily: "Times-Bold", textTransform: "uppercase" as const, color: "#000000" },
  entryTitle: { fontFamily: "Times-Bold", color: "#000000", flexShrink: 1 },
};

const styles = {
  normal: StyleSheet.create({
    page: { paddingHorizontal: 42, paddingVertical: 40, fontSize: 11, lineHeight: 1.6 },
    name: { ...shared.name, fontSize: 20, marginBottom: 4, letterSpacing: -0.4 },
    contact: { fontSize: 9, color: "#52525B", textAlign: "center" },
    section: { marginBottom: 12 },
    sectionTitle: {
      fontFamily: "Times-Bold",
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      color: "#000000",
      borderBottom: "1.5px solid #333333",
      paddingBottom: 3,
      marginBottom: 6,
    },
    entry: { marginBottom: 8 },
    entryTitle: { ...shared.entryTitle, fontSize: 11 },
    entryDate: { fontSize: 9, color: "#71717A" },
    entrySub: { fontSize: 9.5, color: "#52525B", marginTop: 1 },
    body: { fontSize: 11, color: "#3F3F46", marginTop: 2 },
    bullet: { fontSize: 11, color: "#3F3F46", marginBottom: 2 },
    signatureName: { fontFamily: "Times-Italic", fontSize: 12, color: "#000000" },
    signatureLabel: { fontSize: 8, color: "#71717A", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  }),
  compact: StyleSheet.create({
    page: { paddingHorizontal: 36, paddingVertical: 30, fontSize: 9.5, lineHeight: 1.4 },
    name: { ...shared.name, fontSize: 17, marginBottom: 3, letterSpacing: -0.34 },
    contact: { fontSize: 8, color: "#52525B", textAlign: "center" },
    section: { marginBottom: 8 },
    sectionTitle: {
      fontFamily: "Times-Bold",
      fontSize: 9,
      textTransform: "uppercase",
      letterSpacing: 1.4,
      color: "#000000",
      borderBottom: "1.5px solid #333333",
      paddingBottom: 2,
      marginBottom: 4,
    },
    entry: { marginBottom: 5 },
    entryTitle: { ...shared.entryTitle, fontSize: 9.5 },
    entryDate: { fontSize: 8.2, color: "#71717A" },
    entrySub: { fontSize: 8.5, color: "#52525B", marginTop: 0.5 },
    body: { fontSize: 9.5, color: "#3F3F46", marginTop: 1 },
    bullet: { fontSize: 9.5, color: "#3F3F46", marginBottom: 1 },
    signatureName: { fontFamily: "Times-Italic", fontSize: 10.5, color: "#000000" },
    signatureLabel: { fontSize: 7, color: "#71717A", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 1.5 },
  }),
} as const;
