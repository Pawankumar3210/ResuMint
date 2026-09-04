// One-time icon generation script. Not run automatically (no npm script
// wired to it) -- it's a rebrand-time tool, not part of the normal build.
// `sharp` is NOT a project dependency (it's only needed to run this
// script); reinstall it temporarily if you ever need to regenerate icons:
//   npm install --save-dev sharp && node scripts/generate-icons.mjs && npm uninstall sharp
import sharp from "sharp";

const SOURCE = "public/logo-mark-dark.png"; // not square, transparent background, light line-work for the dark icon canvas below
const DARK_BG = "#08080D";

async function squareIcon(size, background, paddingRatio, outPath) {
  const inner = Math.round(size * (1 - paddingRatio));
  const logoBuffer = await sharp(SOURCE)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: logoBuffer, gravity: "center" }])
    .png()
    .toFile(outPath);
}

async function main() {
  // Standard "any" purpose icons: small padding so the logo doesn't
  // touch the edges (it's an irregular shape, not a filled square).
  await squareIcon(192, DARK_BG, 0.12, "public/icon-192.png");
  await squareIcon(512, DARK_BG, 0.12, "public/icon-512.png");

  // Maskable icons: platforms (esp. Android adaptive icons) crop these
  // into various shapes, so content must stay within a safe center zone.
  await squareIcon(192, DARK_BG, 0.3, "public/icon-maskable-192.png");
  await squareIcon(512, DARK_BG, 0.3, "public/icon-maskable-512.png");

  // Favicon -- small, so extra-generous padding keeps it legible at tiny sizes.
  await squareIcon(64, DARK_BG, 0.14, "public/favicon.png");

  console.log("Icons generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
