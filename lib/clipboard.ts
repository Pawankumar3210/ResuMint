/** Copies text with a selection-based fallback for browsers or contexts
 *  where the Clipboard API is unavailable (older browsers, non-HTTPS). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}
