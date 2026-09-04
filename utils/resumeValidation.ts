const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose on purpose: accepts spaces, dashes, parens, +country codes.
const PHONE_RE = /^[+]?[\d\s()-]{7,}$/;

export function isValidEmail(value: string): boolean {
  return value.trim() === "" || EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return value.trim() === "" || PHONE_RE.test(value.trim());
}

export function isValidUrl(value: string): boolean {
  if (value.trim() === "") return true;
  try {
    // Allow bare domains like "github.com/x" by prefixing a scheme.
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    new URL(withScheme);
    return true;
  } catch {
    return false;
  }
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Trims leading/trailing whitespace and collapses any run of internal
 * whitespace down to a single space -- catches copy-paste artifacts like
 * "John   Doe " or a stray tab from a pasted spreadsheet cell, without
 * touching the words themselves. Applied on blur (see
 * PersonalDetailsSection) so it never fights typing mid-word.
 */
export function cleanWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Trims and lowercases an email address on blur. Email addresses are
 * effectively case-insensitive in practice (virtually no real mail
 * provider treats the local part case-sensitively), and a resume with
 * an email left in whatever case an accidental Caps Lock produced reads
 * as a typo to anyone reviewing it -- normalizing quietly avoids that.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Strips a leading scheme (http://, https://, ...), a leading "www.", and
 * trailing slash(es) from a pasted or typed profile URL -- normalizes
 * e.g. "https://www.linkedin.com/in/x/" down to "linkedin.com/in/x",
 * matching the bare-domain form the app already displays everywhere
 * (preview, PDF, DOCX) regardless of what was typed in. Applied on blur
 * (see PersonalDetailsSection) rather than on every keystroke, so it
 * doesn't fight typing or disturb cursor position mid-paste.
 */
export function normalizeProfileUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}
