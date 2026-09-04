/**
 * Full-bleed, fixed background layer shared by the whole app.
 * Purely decorative -- aria-hidden and pointer-events disabled.
 * Just the checkered grid (via the .app-background::before rule in
 * globals.css); no color orbs.
 */
export function AppBackground() {
  return <div className="app-background" aria-hidden="true" />;
}
