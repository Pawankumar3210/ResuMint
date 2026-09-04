/**
 * Plain (non-React) mutable flags, one per programmatic resume-loading
 * flow (demo, import). BuilderHeader's "just hit 100% complete"
 * celebration effect checks these before firing, so a resume that
 * reaches 100% because a canned demo or an imported file was loaded --
 * rather than because the person actually finished writing it -- doesn't
 * get a "Resume Complete!" congratulations that wouldn't make sense.
 *
 * A plain module-level flag (rather than React state) is used
 * deliberately: it needs to still read `true` inside BuilderHeader's
 * effect at the exact moment the triggering render commits, and callers
 * clear it one tick late (via a delayed setTimeout after their own
 * `setResume` call) so it survives long enough for that effect to see it
 * -- a same-tick React state update wouldn't reliably do that, since
 * React can batch it into the very same commit.
 */
export function createLoadFlag() {
  return { active: false };
}

export const demoLoadState = createLoadFlag();
export const importLoadState = createLoadFlag();

/** True if any programmatic load is currently suppressing the celebration. */
export function isProgrammaticLoadActive(): boolean {
  return demoLoadState.active || importLoadState.active;
}
