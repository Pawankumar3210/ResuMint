/**
 * Triggers a browser download of a Blob with a given filename. Pure
 * client-side (creates a temporary object URL + anchor click), so the
 * resume data never touches a server -- consistent with the
 * privacy-first requirement.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on a delay so slower browsers finish the download first.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Slugifies a saved resume's display name (from the multi-resume
 *  switcher) into a safe filename base, e.g. "Resume — SWE" ->
 *  "Resume_SWE", "My Resume" -> "My_Resume". Deliberately sourced from
 *  the switcher name rather than the person's name from Personal
 *  Details: renaming a saved resume there is what should be reflected
 *  here, so two resumes saved under different names (e.g. "Resume — SWE"
 *  vs "Resume — PM") download as two different files instead of both
 *  silently producing the same filename. */
export function suggestedFilename(resumeName: string): string {
  const slug = resumeName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "My_Resume";
}
