/**
 * Zero-backend shareable resume links via URL hash encoding.
 *
 * Uses lz-string to compress JSON -> URL-safe base64 string stored in
 * window.location.hash. No server, no account, no database required.
 */
import LZString from "lz-string";
import type { Resume } from "@/types/resume";

/** Prefix to distinguish resume payload hashes from arbitrary anchor links */
export const SHARE_HASH_PREFIX = "data=";

/** Compress a Resume object into a URL-safe encoded hash string (with prefix). */
export function encodeResumeToHash(resume: Resume): string {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(resume));
  return `#${SHARE_HASH_PREFIX}${compressed}`;
}

/** Decompress and parse a Resume from a URL hash string.
 *  Returns null if the hash is missing, corrupt, or not a resume. */
export function decodeResumeFromHash(hashValue: string): Resume | null {
  try {
    if (!hashValue) return null;
    let clean = hashValue.trim();
    if (clean.startsWith("#")) clean = clean.slice(1);
    if (clean.startsWith(SHARE_HASH_PREFIX)) {
      clean = clean.slice(SHARE_HASH_PREFIX.length);
    }
    if (!clean) return null;

    const decompressed = LZString.decompressFromEncodedURIComponent(clean);
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);
    // Sanity check: must be an object with personal details
    if (parsed && typeof parsed === "object" && parsed.personal) {
      return parsed as Resume;
    }
    return null;
  } catch {
    return null;
  }
}
