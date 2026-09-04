// WCAG contrast ratio audit for ResuMint's design tokens.
// AA thresholds: 4.5:1 for normal text, 3:1 for large text (18px+/bold 14px+) and UI components.
// Run with: node scripts/contrast-audit.mjs
// Update the hex values below if globals.css tokens change.

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(hex1, hex2) {
  const L1 = relLuminance(hexToRgb(hex1));
  const L2 = relLuminance(hexToRgb(hex2));
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

function composite(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const out = fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const themes = {
  dark: {
    background: "#09090b",
    foreground: "#fafafa",
    foregroundSecondary: "#a1a1aa",
    primary: "#14b8a6",
    primaryForeground: "#052e2b",
    accent: "#06b6d4",
    success: "#22c55e",
    warning: "#facc15",
    error: "#ef4444",
    popover: "#111113",
    glassOverlayColor: "#ffffff",
    glassAlpha: 0.09,
    glassBorderAlpha: 0.36,
    mutedOverlayColor: "#ffffff",
    mutedAlpha: 0.08,
  },
  light: {
    background: "#f9f6f0",
    foreground: "#09090b",
    foregroundSecondary: "#52525b",
    primary: "#0f766e",
    primaryForeground: "#ffffff",
    accent: "#0891b2",
    success: "#16a34a",
    warning: "#a16207",
    error: "#dc2626",
    popover: "#ffffff",
    glassOverlayColor: "#09090b",
    glassAlpha: 0.06,
    glassBorderAlpha: 0.45,
    mutedOverlayColor: "#09090b",
    mutedAlpha: 0.07,
  },
};

for (const [name, t] of Object.entries(themes)) {
  console.log(`\n=== ${name.toUpperCase()} THEME ===`);
  const glassBg = composite(t.glassOverlayColor, t.glassAlpha, t.background);
  const glassBorder = composite(t.glassOverlayColor, t.glassBorderAlpha, t.background);
  const mutedBg = composite(t.mutedOverlayColor, t.mutedAlpha, t.background);

  const checks = [
    ["Body text on background", t.foreground, t.background, 4.5],
    ["Secondary text on background", t.foregroundSecondary, t.background, 4.5],
    ["Body text on glass-surface (composited)", t.foreground, glassBg, 4.5],
    ["Secondary text on glass-surface (composited)", t.foregroundSecondary, glassBg, 4.5],
    ["Body text on muted (composited)", t.foreground, mutedBg, 4.5],
    ["Glass border vs background (non-text UI)", glassBorder, t.background, 3.0],
    ["Primary-foreground on primary button", t.primaryForeground, t.primary, 4.5],
    ["Primary text/icon on background", t.primary, t.background, 3.0],
    ["Accent text/icon on background", t.accent, t.background, 3.0],
    ["Success icon on background", t.success, t.background, 3.0],
    ["Warning icon on background", t.warning, t.background, 3.0],
    ["Error icon on background", t.error, t.background, 3.0],
    ["Body text on popover", t.foreground, t.popover, 4.5],
  ];

  for (const [label, fg, bg, threshold] of checks) {
    const ratio = contrast(fg, bg);
    const pass = ratio >= threshold;
    console.log(
      `${pass ? "PASS" : "FAIL"}  ${ratio.toFixed(2)}:1  (need ${threshold}:1)  -- ${label}  [${fg} on ${bg}]`
    );
  }
}
