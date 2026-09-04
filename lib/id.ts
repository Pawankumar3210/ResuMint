/**
 * Generates a client-safe unique id for repeatable entries (education,
 * experience, projects, etc). Falls back gracefully if crypto.randomUUID
 * isn't available (older Safari, non-secure contexts).
 */
export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
