import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { Resume, ReorderableSectionId } from "@/types/resume";
import type { PageLayout } from "@/types/export";
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
  const isModern = resume.template === "modern";
  const s = isModern
    ? (layout === "one" || resume.onePageFit ? styles.modernCompact : styles.modernNormal)
    : (layout === "one" || resume.onePageFit ? styles.compact : styles.normal);
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
  } = resume;

  const contactLine = joinNonEmpty(
    [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio],
    isModern ? "  •  " : "  |  "
  );

  const SIDEBAR_SECTIONS = new Set<ReorderableSectionId>([
    "education",
    "skills",
    "certifications",
    "languages",
  ]);
  if (custom.column === "left") SIDEBAR_SECTIONS.add("custom");
  if (custom2.column === "left") SIDEBAR_SECTIONS.add("custom2");
  if (custom3.column === "left") SIDEBAR_SECTIONS.add("custom3");

  const sidebarOrder = sectionOrder.filter((id) => SIDEBAR_SECTIONS.has(id));
  const mainOrder = sectionOrder.filter((id) => !SIDEBAR_SECTIONS.has(id));

  const sectionRenderers: Record<ReorderableSectionId, () => React.ReactNode> = {
    summary: () =>
      summaryEnabled && summary.text.trim() ? (
        <Section key="summary" title="Professional Summary" s={s}>
          <Text style={s.body}>{summary.text}</Text>
        </Section>
      ) : null,

    education: () =>
      educationEnabled && education.length > 0 ? (
        <Section key="education" title="Education" s={s}>
          {education.map((e) => (
            <View key={e.id} style={s.entry} wrap={false}>
              {isModern ? (
                <View>
                  <Text style={s.entryTitle}>
                    {e.degree || "Degree"}
                    {e.branch ? `, ${e.branch}` : ""}
                  </Text>
                  <Text style={s.entrySub}>{e.institution}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
                    <Text style={s.entryDate}>
                      {formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear)}
                    </Text>
                    {e.grade && <Text style={s.entryDate}>{e.grade}</Text>}
                  </View>
                </View>
              ) : (
                <>
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
                </>
              )}
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
              {p.techStack?.trim() && (
                <Text style={s.body}>
                  <Text style={s.entryTitle}>Tech Stack: </Text>
                  {p.techStack}
                </Text>
              )}
            </View>
          ))}
        </Section>
      ) : null,

    skills: () =>
      skills.length > 0 ? (
        <Section key="skills" title="Skills" s={s}>
          {(resume.skillCategories ?? []).map((cat) => {
            const items = skills.filter((sk) => sk.category === cat.id);
            if (items.length === 0) return null;
            return isModern ? (
              <View key={cat.id} style={{ marginBottom: 3 }} wrap={false}>
                <Text style={[s.entryTitle, { fontSize: s.entryDate.fontSize + 0.8 }]}>
                  {cat.label}
                </Text>
                <Text style={s.body}>{items.map((sk) => sk.label).join(", ")}</Text>
              </View>
            ) : (
              <Text key={cat.id} style={s.body}>
                <Text style={s.entryTitle}>{cat.label}: </Text>
                {items.map((sk) => sk.label).join(", ")}
              </Text>
            );
          })}
        </Section>
      ) : null,

    certifications: () =>
      certificationsEnabled && certifications.length > 0 ? (
        <Section key="certifications" title="Certifications" s={s}>
          {certifications.map((c) => (
            <View key={c.id} style={isModern ? s.entry : base.entryHeadRow} wrap={false}>
              {isModern ? (
                <View>
                  <Text style={s.entryTitle}>{c.name || "Certification"}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 1 }}>
                    <Text style={s.entrySub}>{c.organization}</Text>
                    <Text style={s.entryDate}>{joinNonEmpty([c.month, c.year])}</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={s.entryTitle}>
                    {c.name || "Certification"}
                    {c.organization ? <Text style={s.body}> — {c.organization}</Text> : null}
                  </Text>
                  <Text style={s.entryDate}>{joinNonEmpty([c.month, c.year])}</Text>
                </>
              )}
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

    languages: () =>
      languagesEnabled && languages.length > 0 ? (
        <Section key="languages" title="Languages" s={s}>
          <Text style={s.body}>{languages.map((l) => l.label).join(", ")}</Text>
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

    custom2: () =>
      custom2.enabled && (custom2.title.trim() || custom2.body.trim()) ? (
        <Section key="custom2" title={custom2.title || "Custom Section 2"} s={s}>
          <Text style={s.body}>{custom2.body}</Text>
        </Section>
      ) : null,

    custom3: () =>
      custom3.enabled && (custom3.title.trim() || custom3.body.trim()) ? (
        <Section key="custom3" title={custom3.title || "Custom Section 3"} s={s}>
          <Text style={s.body}>{custom3.body}</Text>
        </Section>
      ) : null,
  };

  return (
    <Document title={`${personal.fullName || "Resume"} — Resume`} author={personal.fullName || undefined}>
      <Page size="A4" style={[isModern ? base.modernPage : base.page, s.page]} wrap>
        <View style={isModern ? base.modernHeader : base.header}>
          <Text style={s.name}>{personal.fullName || "Your Name"}</Text>
          {contactLine && <Text style={s.contact}>{contactLine}</Text>}
        </View>

        {isModern ? (
          <View style={base.twoColContainer}>
            <View style={base.sidebarCol}>
              {sidebarOrder.map((id) => sectionRenderers[id]())}
            </View>
            <View style={base.colDivider} />
            <View style={base.mainCol}>
              {mainOrder.map((id) => sectionRenderers[id]())}
            </View>
          </View>
        ) : (
          sectionOrder.map((id) => sectionRenderers[id]())
        )}
      </Page>
    </Document>
  );
}

type PdfStyles = (typeof styles)[keyof typeof styles];

function Section({ title, s, children }: { title: string; s: PdfStyles; children: React.ReactNode }) {
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
  modernPage: { fontFamily: "Helvetica", color: "#27272a" },
  header: {
    marginBottom: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  modernHeader: {
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4E7",
    alignItems: "flex-start",
  },
  twoColContainer: {
    flexDirection: "row",
    gap: 14,
    flexGrow: 1,
  },
  sidebarCol: {
    width: "34%",
  },
  colDivider: {
    width: 1,
    backgroundColor: "#E4E4E7",
    alignSelf: "stretch",
  },
  mainCol: {
    flex: 1,
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

const modernShared = {
  name: { fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const, color: "#09090b" },
  entryTitle: { fontFamily: "Helvetica-Bold", color: "#09090b", flexShrink: 1 },
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
  modernNormal: StyleSheet.create({
    page: { paddingHorizontal: 36, paddingVertical: 34, fontSize: 10, lineHeight: 1.5 },
    name: { ...modernShared.name, fontSize: 18, marginBottom: 3, letterSpacing: -0.2 },
    contact: { fontSize: 8.5, color: "#52525B", textAlign: "left" },
    section: { marginBottom: 11 },
    sectionTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: 9.5,
      textTransform: "uppercase",
      letterSpacing: 1.2,
      color: "#09090b",
      borderBottom: "1px solid #71717A",
      paddingBottom: 2,
      marginBottom: 5,
    },
    entry: { marginBottom: 7 },
    entryTitle: { ...modernShared.entryTitle, fontSize: 9.5 },
    entryDate: { fontSize: 8.5, color: "#71717A" },
    entrySub: { fontSize: 9, color: "#52525B", marginTop: 1 },
    body: { fontSize: 9.5, color: "#3F3F46", marginTop: 2 },
    bullet: { fontSize: 9.5, color: "#3F3F46", marginBottom: 2 },
    signatureName: { fontFamily: "Helvetica-Oblique", fontSize: 11, color: "#000000" },
    signatureLabel: { fontSize: 7.5, color: "#71717A", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  }),
  modernCompact: StyleSheet.create({
    page: { paddingHorizontal: 30, paddingVertical: 26, fontSize: 9, lineHeight: 1.38 },
    name: { ...modernShared.name, fontSize: 16, marginBottom: 2, letterSpacing: -0.2 },
    contact: { fontSize: 8, color: "#52525B", textAlign: "left" },
    section: { marginBottom: 7 },
    sectionTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: 8.5,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: "#09090b",
      borderBottom: "1px solid #71717A",
      paddingBottom: 1.5,
      marginBottom: 3.5,
    },
    entry: { marginBottom: 4.5 },
    entryTitle: { ...modernShared.entryTitle, fontSize: 8.8 },
    entryDate: { fontSize: 7.8, color: "#71717A" },
    entrySub: { fontSize: 8, color: "#52525B", marginTop: 0.5 },
    body: { fontSize: 8.8, color: "#3F3F46", marginTop: 1 },
    bullet: { fontSize: 8.8, color: "#3F3F46", marginBottom: 1 },
    signatureName: { fontFamily: "Helvetica-Oblique", fontSize: 10, color: "#000000" },
    signatureLabel: { fontSize: 7, color: "#71717A", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 1.5 },
  }),
} as const;
