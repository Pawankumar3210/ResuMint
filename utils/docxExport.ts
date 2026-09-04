import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
} from "docx";
import type { Resume, ReorderableSectionId } from "@/types/resume";
import { SKILL_CATEGORIES } from "@/types/resume";
import type { PageLayout } from "@/types/export";
import { SKILL_CATEGORY_META } from "@/constants/resume-defaults";
import { formatDateRange, joinNonEmpty } from "@/utils/helpers";

const COLOR_BLACK = "000000";
const COLOR_MUTED = "52525B";
const COLOR_BODY = "3F3F46";
const FONT = "Times New Roman";

type DocxNode = Paragraph | Table;

/**
 * Builds a real, editable .docx Document -- opens correctly in Word and
 * Google Docs, per spec. Mirrors ResumePaper's section order/styling
 * (Times New Roman, bold black uppercase headings with an underline rule)
 * so the download matches what the user saw in the live preview.
 *
 * SECTION ORDER: the name/contact header (from resume.personal) is
 * always emitted first, same as ResumePaper -- "personal" is never part
 * of resume.sectionOrder. Every other section is produced by
 * `sectionBuilders[id]()` and appended in resume.sectionOrder's order,
 * so the downloaded .docx always matches the live preview and the
 * builder sidebar's section ordering exactly.
 */
export function buildResumeDocx(resume: Resume, layout: PageLayout): Document {
  const compact = layout === "one";
  const bodySize = compact ? 19 : 22; // half-points: 19 = 9.5pt, 22 = 11pt
  const spacingAfter = compact ? 80 : 140;

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

  const contactLine = joinNonEmpty(
    [personal.email, personal.phone, personal.location, personal.linkedin, personal.github, personal.portfolio],
    "  |  "
  );

  const children: DocxNode[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: "center",
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: (personal.fullName || "Your Name").toUpperCase(),
          bold: true,
          size: compact ? 34 : 40,
          color: COLOR_BLACK,
        }),
      ],
    }),
  ];

  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: "center",
        spacing: { after: 200 },
        children: [new TextRun({ text: contactLine, size: 18, color: COLOR_MUTED })],
      })
    );
  }

  const sectionTitle = (title: string) =>
    new Paragraph({
      spacing: { before: spacingAfter, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "666666", space: 4 } },
      children: [
        new TextRun({ text: title.toUpperCase(), bold: true, size: 20, color: COLOR_BLACK, characterSpacing: 32 }),
      ],
    });

  const bodyPara = (text: string, opts: { italic?: boolean; bold?: boolean; color?: string } = {}) =>
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text, size: bodySize, ...opts })],
    });

  const entryHeadPara = (title: string, date: string) =>
    new Paragraph({
      tabStops: [{ type: "right", position: 9500 }],
      spacing: { after: 20 },
      children: [
        new TextRun({ text: title, bold: true, size: bodySize, color: COLOR_BLACK }),
        ...(date ? [new TextRun({ text: `\t${date}`, size: bodySize - 2, color: COLOR_MUTED })] : []),
      ],
    });

  const sectionBuilders: Record<ReorderableSectionId, () => DocxNode[]> = {
    summary: () => {
      if (!summary.text.trim()) return [];
      return [sectionTitle("Summary"), bodyPara(summary.text, { color: COLOR_BODY })];
    },

    education: () => {
      if (education.length === 0) return [];
      const nodes: DocxNode[] = [sectionTitle("Education")];
      education.forEach((e) => {
        const title = `${e.institution || "Institution"}${e.degree ? ` — ${e.degree}${e.branch ? `, ${e.branch}` : ""}` : ""}`;
        nodes.push(entryHeadPara(title, formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear)));
        if (e.grade) nodes.push(bodyPara(e.grade, { color: COLOR_MUTED }));
      });
      return nodes;
    },

    experience: () => {
      if (experience.length === 0) return [];
      const nodes: DocxNode[] = [sectionTitle("Experience")];
      experience.forEach((e) => {
        const title = `${e.role || "Role"}${e.organization ? ` — ${e.organization}` : ""}`;
        nodes.push(
          entryHeadPara(title, formatDateRange(e.startMonth, e.startYear, e.endMonth, e.endYear, e.current)),
          bodyPara(e.type, { color: COLOR_MUTED })
        );
        if (e.description) nodes.push(bodyPara(e.description, { color: COLOR_BODY }));
      });
      return nodes;
    },

    projects: () => {
      if (projects.length === 0) return [];
      const nodes: DocxNode[] = [sectionTitle("Projects")];
      projects.forEach((p) => {
        nodes.push(entryHeadPara(p.name || "Project", joinNonEmpty([p.githubUrl, p.liveUrl])));
        if (p.description) nodes.push(bodyPara(p.description, { color: COLOR_BODY }));
      });
      return nodes;
    },

    skills: () => {
      if (skills.length === 0) return [];
      const nodes: DocxNode[] = [sectionTitle("Skills")];
      SKILL_CATEGORIES.forEach((category) => {
        const items = skills.filter((s) => s.category === category);
        if (items.length === 0) return;
        nodes.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${SKILL_CATEGORY_META[category].label}: `, bold: true, size: bodySize, color: COLOR_BLACK }),
              new TextRun({ text: items.map((s) => s.label).join(", "), size: bodySize, color: COLOR_BODY }),
            ],
          })
        );
      });
      return nodes;
    },

    certifications: () => {
      if (certifications.length === 0) return [];
      const nodes: DocxNode[] = [sectionTitle("Certifications")];
      certifications.forEach((c) => {
        const title = `${c.name || "Certification"}${c.organization ? ` — ${c.organization}` : ""}`;
        nodes.push(entryHeadPara(title, joinNonEmpty([c.month, c.year])));
      });
      return nodes;
    },

    achievements: () => {
      if (!achievementsEnabled || achievements.length === 0) return [];
      const nodes: DocxNode[] = [sectionTitle("Achievements")];
      achievements.forEach((a) => {
        nodes.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 20 },
            children: [new TextRun({ text: a.text, size: bodySize, color: COLOR_BODY })],
          })
        );
      });
      return nodes;
    },

    languages: () => {
      if (languages.length === 0) return [];
      return [sectionTitle("Languages"), bodyPara(languages.map((l) => l.label).join(", "), { color: COLOR_BODY })];
    },

    declaration: () => {
      if (!declaration.enabled || !declaration.text.trim()) return [];
      const nodes: DocxNode[] = [sectionTitle("Declaration"), bodyPara(declaration.text, { color: COLOR_BODY })];

      const { showPlace, showDate, showSignature, showSignatureName, signatureName } = declaration;
      if (showPlace || showDate || showSignature) {
        const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
        const tableBorders = {
          top: noBorder,
          bottom: noBorder,
          left: noBorder,
          right: noBorder,
          insideHorizontal: noBorder,
          insideVertical: noBorder,
        };
        const hasLeft = showPlace || showDate;

        const leftCellChildren: Paragraph[] = [];
        if (showPlace) {
          leftCellChildren.push(
            new Paragraph({
              spacing: { after: showDate ? 20 : 0 },
              children: [
                new TextRun({ text: `Place: ${declaration.place || "_______________"}`, size: bodySize - 2, color: COLOR_MUTED }),
              ],
            })
          );
        }
        if (showDate) {
          leftCellChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `Date: ${declaration.date || "_______________"}`, size: bodySize - 2, color: COLOR_MUTED }),
              ],
            })
          );
        }

        const signatureCellChildren: Paragraph[] = [
          ...(showSignatureName && signatureName?.trim()
            ? [
                new Paragraph({
                  alignment: "center" as const,
                  spacing: { after: 20 },
                  children: [
                    new TextRun({ text: signatureName, italics: true, bold: true, size: bodySize, color: COLOR_BLACK }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            alignment: "center",
            spacing: { after: 20 },
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "666666", space: 1 } },
            children: [new TextRun({ text: "", size: 2 })],
          }),
          new Paragraph({
            alignment: "center",
            children: [
              new TextRun({ text: "SIGNATURE", size: bodySize - 4, color: COLOR_MUTED, characterSpacing: 20 }),
            ],
          }),
        ];

        // Only a real two-column table when both sides are present -- a
        // single Paragraph is used instead when just one side is shown, so
        // it stays naturally left- or right-aligned rather than sitting in
        // an oversized table cell.
        if (hasLeft && showSignature) {
          nodes.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.BOTTOM,
                      margins: { top: 200, right: 200 },
                      children: leftCellChildren,
                    }),
                    new TableCell({
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      verticalAlign: VerticalAlign.BOTTOM,
                      margins: { top: 200, left: 200 },
                      children: signatureCellChildren,
                    }),
                  ],
                }),
              ],
            })
          );
        } else if (hasLeft) {
          nodes.push(new Paragraph({ spacing: { before: 200 }, children: [] }), ...leftCellChildren);
        } else if (showSignature) {
          nodes.push(
            new Table({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              alignment: "right",
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      margins: { top: 200 },
                      children: signatureCellChildren,
                    }),
                  ],
                }),
              ],
            })
          );
        }
      }

      return nodes;
    },

    custom: () => {
      if (!custom.enabled || !(custom.title.trim() || custom.body.trim())) return [];
      const nodes: DocxNode[] = [sectionTitle(custom.title || "Custom Section")];
      if (custom.body) nodes.push(bodyPara(custom.body, { color: COLOR_BODY }));
      return nodes;
    },
  };

  sectionOrder.forEach((id) => {
    children.push(...sectionBuilders[id]());
  });

  return new Document({
    title: `${personal.fullName || "Resume"} — Resume`,
    styles: {
      default: {
        document: {
          run: { font: FONT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: compact ? 620 : 800,
              bottom: compact ? 620 : 800,
              left: compact ? 700 : 900,
              right: compact ? 700 : 900,
            },
          },
        },
        children,
      },
    ],
  });
}
