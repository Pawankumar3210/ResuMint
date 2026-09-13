const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only digits, spaces, +, -, and parens are allowed characters at all
// (catches "words"/letters typed by mistake immediately).
const PHONE_ALLOWED_CHARS_RE = /^[+\d\s()-]*$/;

export function isValidEmail(value: string): boolean {
  return value.trim() === "" || EMAIL_RE.test(value.trim());
}

/**
 * Valid once there are between 10 and 15 digits (after stripping
 * formatting characters) -- 10 covers a plain local number on its own
 * (e.g. "9876543210"), and 15 is the ITU E.164 maximum total length for
 * a full international number including a country code (e.g. "+91
 * 98765 43210" is 12 digits, well within range). Below 10 digits is
 * flagged as invalid specifically so someone who's typed only 8 or 9 of
 * their 10-digit number sees the error immediately, rather than only
 * finding out later that a digit went missing.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (!PHONE_ALLOWED_CHARS_RE.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, "").length;
  return digitCount >= 10 && digitCount <= 15;
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
