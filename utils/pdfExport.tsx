import { pdf } from "@react-pdf/renderer";
import type { Resume } from "@/types/resume";
import type { PageLayout } from "@/types/export";
import { ResumePdfDocument } from "@/components/preview/resume-pdf-document";

/**
 * Generates a real, selectable-text PDF entirely client-side (nothing
 * ever leaves the browser, per the privacy-first requirement).
 */
export async function generateResumePdfBlob(resume: Resume, layout: PageLayout): Promise<Blob> {
  const instance = pdf(<ResumePdfDocument resume={resume} layout={layout} />);
  return instance.toBlob();
}
